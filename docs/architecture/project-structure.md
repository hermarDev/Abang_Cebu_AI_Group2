# AbangCebuAI Project Directory Architecture & Ownership

## 1. Directory Tree & Standards
This codebase is organized to support a multi-developer team building a production-grade, AI-assisted geospatial rental platform in Cebu, Philippines.

```
abang-cebu-ai/
├── docs/                                # Architecture blueprints, requirements, and QA artifacts
│   ├── architecture/                    # Current framework and system boundaries
│   ├── database/                         # Database schema and Supabase architecture
│   ├── design/                           # Product design, UI tokens, and personas
│   ├── flowcharts/                       # Approved system and user-flow diagrams
│   ├── pdf/                              # Approved specification and architecture exports
│   ├── security/                         # Access control and environment policy
│   ├── specifications/                   # Product and engineering requirements
│   └── testing/                          # QA plans and test artifacts
├── public/                              # Logos, fonts, map style, and MapLibre worker assets
├── scripts/                             # Project maintenance and asset-copy scripts
├── supabase/                            # Supabase CLI local database management
│   ├── config.toml                      # Local emulator and pooler configuration
│   ├── migrations/                      # Version-controlled SQL migration scripts
│   └── seed.sql                         # Local testing seed data
├── src/
│   ├── app/                             # Next.js 16 App Router and API routes
│   │   ├── (auth)/                      # Login, registration, and password reset pages
│   │   ├── api/                         # Auth, places, rentals, and logout handlers
│   │   ├── auth/                        # OAuth and reset-password callbacks
│   │   ├── layout.tsx                   # Root layout and global metadata
│   │   └── page.tsx                     # Home route mounting the rental finder
│   ├── components/                      # Reusable interface and auth components
│   │   ├── auth/                        # Account forms and session synchronization
│   │   ├── features/                    # Reusable feature controls
│   │   ├── map/                         # MapLibre client components and geometry
│   │   │   ├── MapCanvasLoader.tsx       # Client-only dynamic map boundary
│   │   │   └── MapCanvas.tsx             # MapLibre rendering component
│   │   └── ui/                          # Tested interface primitives
│   ├── contracts/                       # Shared rental and filter contracts
│   ├── features/                        # Domain UI, rental, and map behavior
│   │   ├── listings/                    # Rental preview data
│   │   ├── map/                         # RestoredFinderShell and map experience
│   │   └── rentals/                     # Rental filtering and search
│   ├── hooks/                           # Reserved placeholder (.gitkeep)
│   ├── lib/                             # Shared utilities and third-party SDK wrappers
│   │   ├── auth/                        # Authentication and logout behavior
│   │   ├── search/                      # Place search helpers
│   │   ├── supabase/                    # Browser/server clients and session middleware
│   │   └── utils.ts                     # Canonical cn() helper (clsx + tailwind-merge)
│   ├── server/                          # Route services and rental data mapping
│   │   ├── actions/                     # Reserved placeholder (.gitkeep)
│   │   ├── places/                      # Place lookup integration
│   │   ├── queries/                     # Reserved placeholder (.gitkeep)
│   │   └── rentals/                     # Rental data mapping and validation
│   ├── styles/                          # Global design tokens and finder surface styles
│   │   └── finder/                      # Header, results rail, filters, drawer, and base CSS
│   └── types/                           # Auth, database, and shared TypeScript types
├── .env.example                         # Environment variable specifications
├── middleware.ts                        # Supabase session refresh; Next.js 16 legacy Middleware convention
├── next.config.ts                       # Next.js compiler configuration
├── package.json                         # Project dependencies and npm scripts
├── pnpm-lock.yaml                       # Strict deterministic lockfile
├── postcss.config.mjs                   # PostCSS configuration for Tailwind v4
└── tsconfig.json                        # Strict TypeScript compilation configuration
```

---

## 2. Layer Responsibilities & Ownership Rules

### `src/app` (Routing & Layouts)
- **Role**: Presentation and page layout composition.
- **Rule**: Keep business logic and direct third-party API calls outside of `page.tsx` files. Follow the existing feature/component/API boundaries; use `src/server/queries` or `src/server/actions` only when those modules are implemented for the operation.
- **Default Execution**: Every file inside `src/app` is a **React Server Component** unless marked with `'use client'`.

### `src/components/ui` (Design System Primitives)
- **Role**: Reusable, atomic, unopinionated UI primitives (`Button`, `Card`, `Badge`, `Skeleton`, `Input`).
- **Rule**: Must not contain domain-specific logic, Supabase calls, or route knowledge.

### `src/components/map` (Geospatial & MapLibre)
- **Role**: All interactive mapping, GIS overlays, custom pin clustering, and WebGL rendering.
- **Rule**: MapLibre must **never** be imported directly in Server Components. It must be quarantined behind dynamic imports with `{ ssr: false }` to avoid `window is not defined` server crashes.

### `src/lib/supabase` (Database & Authentication)
- **Role**: Standard client and server factories for Supabase PostgreSQL.
- **Rule**:
  - In Server Components, Server Actions, or Route Handlers: **always** use `src/lib/supabase/server.ts` (`const supabase = await createClient()`).
  - In Client Components (`'use client'`): use `src/lib/supabase/client.ts` (`const supabase = createClient()`).

### `src/server` (Backend Services & Queries)
- **Role**: Server-only operations: place lookup and rental-row validation/mapping. The `actions/` and `queries/` directories remain reserved placeholders; current API handlers call the implemented modules directly.
- **Rule**: Keep imports from this directory in server-only code; the directory name alone does not prevent client bundling. Current consumers are Route Handlers.

---

## 3. Team Naming & Code Conventions
- **Directories**: Kebab-case (`src/components/ui`, `src/lib/supabase`).
- **Component Files**: Use PascalCase for the current React components (for example, `MapCanvas.tsx`, `RestoredFinderShell.tsx`).
- **Component Functions**: PascalCase (`export function MapContainer()`).
- **Hooks**: Kebab-case prefixed with `use-` (`use-map-bounds.ts`).
- **Utilities**: Kebab-case (`src/lib/utils.ts`).
- **Path Aliases**: Always use `@/*` mapped to `src/*` (e.g. `@/components/ui/Button`).
