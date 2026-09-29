# AbangCebuAI Project Directory Architecture & Ownership

## 1. Directory Tree & Standards
This codebase is organized to support a multi-developer team building a production-grade, AI-assisted geospatial rental platform in Cebu, Philippines.

```
abang-cebu-ai/
├── docs/                                # Architecture blueprints, ADRs, and team standards
│   ├── project-structure.md             # This document (directory layout & module ownership)
│   ├── client-server-boundaries.md      # Server vs Client components & MapLibre WebGL isolation
│   └── next15-guidelines.md             # Next.js 15, React 19, and Supabase SSR standards
├── public/                              # Public static assets (favicons, SVGs, static imagery)
├── src/
│   ├── app/                             # Next.js 15 App Router
│   │   ├── api/                         # Route Handlers (REST / Webhooks)
│   │   ├── map/                         # Spatial Map Explorer route (/map)
│   │   │   └── page.tsx                 # Server Component fetching listings & rendering map
│   │   ├── error.tsx                    # Route-segment error boundary
│   │   ├── globals.css                  # Tailwind CSS v4 root stylesheet
│   │   ├── layout.tsx                   # Global Root Layout (Header, Footer, Fonts)
│   │   ├── not-found.tsx                # Custom 404 page
│   │   └── page.tsx                     # Landing / Homepage
│   ├── components/                      # Reusable UI components
│   │   ├── ui/                          # Atomic design primitives (Button, Card, Badge, Skeleton)
│   │   ├── map/                         # MapLibre GL components & dynamic loaders
│   │   │   ├── index.tsx                # Dynamic loader with ssr: false
│   │   │   ├── map-container.tsx        # Isolated 'use client' WebGL canvas & cleanup
│   │   │   └── types.ts                 # Map-specific TypeScript prop definitions
│   │   ├── layout/                      # Global UI frame (Header, Footer, Navigation)
│   │   └── features/                    # Domain-scoped modules (listings, search, chat, filters)
│   ├── config/                          # Centralized site & geospatial coordinates configuration
│   │   └── site.ts                      # App title, metadata, Cebu coordinates, default map styles
│   ├── hooks/                           # Custom React client hooks (e.g. useGeolocation, useMap)
│   ├── lib/                             # Shared utilities and third-party SDK wrappers
│   │   ├── utils.ts                     # cn() helper (clsx + tailwind-merge)
│   │   └── supabase/                    # Official Supabase SSR integration
│   │       ├── client.ts                # Browser client (createBrowserClient)
│   │       ├── server.ts                # Server client (createServerClient + await cookies())
│   │       ├── middleware.ts            # Auth session refresh handler
│   │       └── types.ts                 # Database schemas & TypeScript table rows
│   ├── server/                          # Server-only logic & database orchestration
│   │   ├── actions/                     # Next.js Server Actions (mutations, forms)
│   │   └── queries/                     # Data fetching functions (e.g. getCebuListings)
│   └── types/                           # Global TypeScript interfaces
│       └── index.ts                     # Listings, MapMarker, Coordinates, GeoJSON
├── .env.example                         # Environment variable specifications
├── middleware.ts                        # Next.js edge middleware for Supabase auth refresh
├── next.config.ts                       # Next.js compiler & image domains configuration
├── package.json                         # Project dependencies and npm scripts
├── pnpm-lock.yaml                       # Strict deterministic lockfile
├── postcss.config.mjs                   # PostCSS configuration for Tailwind v4
└── tsconfig.json                        # Strict TypeScript compilation configuration
```

---

## 2. Layer Responsibilities & Ownership Rules

### `src/app` (Routing & Layouts)
- **Role**: Presentation and page layout composition.
- **Rule**: Keep business logic, database queries, and direct third-party API calls outside of `page.tsx` files. Delegate to `src/server/queries` or `src/server/actions`.
- **Default Execution**: Every file inside `src/app` is a **React Server Component** unless marked with `'use client'`.

### `src/components/ui` (Design System Primitives)
- **Role**: Reusable, atomic, unopinionated UI primitives (`Button`, `Card`, `Badge`, `Skeleton`).
- **Rule**: Must not contain domain-specific logic, Supabase calls, or route knowledge.

### `src/components/map` (Geospatial & MapLibre)
- **Role**: All interactive mapping, GIS overlays, custom pin clustering, and WebGL rendering.
- **Rule**: MapLibre must **never** be imported in Server Components. It is strictly quarantined behind dynamic imports with `{ ssr: false }` to avoid `window is not defined` server crashes.

### `src/lib/supabase` (Database & Authentication)
- **Role**: Standard client and server factories for Supabase PostgreSQL.
- **Rule**:
  - In Server Components, Server Actions, or Route Handlers: **always** use `src/lib/supabase/server.ts` (`const supabase = await createClient()`).
  - In Client Components (`'use client'`): use `src/lib/supabase/client.ts` (`const supabase = createClient()`).

### `src/server` (Backend Services & Queries)
- **Role**: Server-only operations: direct Supabase SQL queries, PostGIS operations, and external AI agent integrations.
- **Rule**: Code in this directory will never be bundled into client browser JavaScript.

---

## 3. Team Naming & Code Conventions
- **Directories**: Kebab-case (`src/components/ui`, `src/lib/supabase`).
- **Component Files**: Kebab-case (`map-container.tsx`, `rental-card.tsx`).
- **Component Functions**: PascalCase (`export function MapContainer()`).
- **Hooks**: Kebab-case prefixed with `use-` (`use-map-bounds.ts`).
- **Utilities**: Kebab-case (`src/lib/utils.ts`).
- **Path Aliases**: Always use `@/*` mapped to `src/*` (e.g. `@/components/ui/button`).
