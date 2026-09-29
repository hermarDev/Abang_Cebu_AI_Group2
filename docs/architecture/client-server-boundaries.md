# Client vs. Server Component Boundaries & MapLibre Integration

## 1. Fundamentals: React Server Components (RSC) in Next.js 15
Next.js 15 uses the App Router where all components are Server Components by default.

| Dimension | Server Component (Default) | Client Component (`'use client'`) |
| :--- | :--- | :--- |
| **Execution** | Runs exclusively on the Node.js/Edge runtime | Pre-rendered to HTML on server, hydrated in browser |
| **Data Access** | Direct PostgreSQL queries, private API keys | Read serialized props, call Server Actions, or use browser SDK |
| **Browser APIs** | ❌ No `window`, `document`, WebGL, or localStorage | ✅ Full access to DOM, canvas, and browser events |
| **React Hooks** | ❌ No `useState`, `useEffect`, `useRef` | ✅ All standard React hooks supported |
| **Client Bundle**| **0 KB** JavaScript added to client | Adds component code to browser JS bundle |

---

## 2. The MapLibre GL WebGL Boundary Challenge

### The Problem
`maplibre-gl` is tightly coupled to browser DOM and GPU APIs:
- Accesses `window` and `document` at module evaluation time.
- Requires `HTMLCanvasElement` and WebGL context (`gl.getContext('webgl2')`).

If imported directly into an RSC or during standard SSR pre-rendering:
```text
ReferenceError: window is not defined
    at Object.<anonymous> (node_modules/maplibre-gl/dist/maplibre-gl.js:...)
```

### The Architectural Solution
1. **Dynamic Client Quarantine (`next/dynamic`)**:
   Wrap the map component in a dynamic loader configured with `{ ssr: false }`. Next.js skips server-side evaluation entirely and only mounts the component once the client DOM is ready.
2. **Server-Side Data Preparation**:
   The Server Component fetches listing coordinates and metadata, strips sensitive data, and passes plain serialized arrays/GeoJSON across the boundary as props.

```mermaid
flowchart TD
    subgraph ServerSide["Server Component Boundary (SSR)"]
        Page["src/app/map/page.tsx (Server Component)"]
        Query["src/server/queries/get-listings.ts"]
        SupabaseDB[("Supabase PostgreSQL DB")]
        
        Page --> Query
        Query --> SupabaseDB
        SupabaseDB --> Query
        Query -->|Plain JSON Data Array| Page
    end

    subgraph ClientBoundary["Client Component Boundary ('use client')"]
        DynamicLoader["src/components/map/index.tsx (next/dynamic ssr:false)"]
        Container["src/components/map/map-container.tsx"]
        MapLibreCanvas["WebGL Canvas Instance (MapLibre GL)"]
        
        Page -->|Props: markers[]| DynamicLoader
        DynamicLoader --> Container
        Container --> MapLibreCanvas
    end
```

---

## 3. WebGL Lifecycle & Preventing Memory Leaks
WebGL contexts are limited system resources managed by the GPU. In a Single Page App (SPA), navigating away from a map page without cleaning up the MapLibre instance causes **WebGL context leaks** (eventually throwing `WARNING: Too many active WebGL contexts. Oldest context will be lost`).

### Implementation Pattern:
```tsx
'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export function MapContainer() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. Initialize instance
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [123.8854, 10.3157], // Cebu City
      zoom: 12,
    });

    mapRef.current = map;

    // 2. CRITICAL CLEANUP: Always remove the map on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={mapContainerRef} className="h-full w-full min-h-[500px]" />;
}
```

---

## 4. Boundaries for Supabase Operations
- **Data Fetching for Pages**: Always fetch inside Server Components using `src/lib/supabase/server.ts`. This benefits from server caching, prevents exposing DB credentials, and keeps client bundles lean.
- **Client Interactions (Realtime / Auth triggers)**: Use `src/lib/supabase/client.ts` inside Client Components (`'use client'`).

---

## 5. OpenStreetMap (OSM) Integration
AbangCebuAI uses **OpenStreetMap** as its primary geographic data foundation. MapLibre GL is the rendering engine that visualizes OpenStreetMap data.

### Standard Configuration: Option A (Direct OpenStreetMap Tiles)
We have selected **Option A** as the project standard. It uses OpenStreetMap standard raster tiles directly with zero external API key requirements.

The style specification is maintained locally in the repository at [`public/styles/osm.json`](/styles/osm.json):
```json
{
  "version": 8,
  "name": "OpenStreetMap Standard",
  "sources": {
    "osm": {
      "type": "raster",
      "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      "tileSize": 256,
      "attribution": "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
    }
  },
  "layers": [
    {
      "id": "osm-tiles",
      "type": "raster",
      "source": "osm",
      "minzoom": 0,
      "maxzoom": 19
    }
  ]
}
```

### Usage in MapLibre:
Developers building map components can simply point the map style to the local endpoint:
```tsx
const map = new Map({
  container: mapContainerRef.current,
  style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || '/styles/osm.json',
  center: [123.8854, 10.3157], // Cebu City Center
  zoom: 12,
});
```

