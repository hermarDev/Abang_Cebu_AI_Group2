# AbangCebuAI Project Directory Architecture & Ownership

## 1. Directory Tree & Standards
This codebase is organized to support a multi-developer team building a production-grade, AI-assisted geospatial rental platform in Cebu, Philippines.

```
abang-cebu-ai/
├── .github/                             # GitHub automation and templates
│   └── pull_request_template.md         # Team PR quality checklist and reviewer sign-off template
├── docs/                                # Architecture blueprints, ADRs, and team standards
│   ├── project-structure.md             # This document (directory layout & module ownership)
│   ├── git-workflow.md                  # Branch naming, Conventional Commits, and peer review guide
│   ├── client-server-boundaries.md      # Server vs Client components & MapLibre WebGL isolation
│   └── next15-guidelines.md             # Next.js 15, React 19, and Supabase SSR standards
├── public/                              # Public static assets (favicons, SVGs, static imagery)
├── src/
│   ├── app/                             # Next.js 15 App Router
│   │   ├── globals.css                  # Tailwind CSS v4 root stylesheet
│   │   ├── layout.tsx                   # Minimal Root Layout
│   │   └── page.tsx                     # Minimal placeholder starter page
│   ├── components/                      # Reusable UI component modules
│   │   ├── ui/                          # (.gitkeep) Reserved for atomic design primitives (Button, Card, Input)
│   │   ├── map/                         # (.gitkeep) Reserved for isolated MapLibre GL client components
│   │   └── features/                    # (.gitkeep) Reserved for domain-scoped feature modules (search, listings)
│   ├── hooks/                           # (.gitkeep) Reserved for custom React client hooks
│   ├── lib/                             # Shared utilities and third-party SDK wrappers
│   │   ├── utils.ts                     # cn() helper (clsx + tailwind-merge)
│   │   └── supabase/                    # Supabase SSR architecture
│   │       ├── client.ts                # Browser client (createBrowserClient)
│   │       ├── server.ts                # Server client (createServerClient + await cookies())
│   │       ├── middleware.ts            # Auth session refresh handler
│   │       └── types.ts                 # Database type schemas
│   ├── server/                          # Server-only logic & database orchestration
│   │   ├── actions/                     # (.gitkeep) Reserved for Next.js Server Actions
│   │   └── queries/                     # (.gitkeep) Reserved for database queries
│   └── types/                           # Global TypeScript interfaces
│       └── index.ts                     # Domain interfaces (Listings, Coordinates, GeoJSON)
├── .env.example                         # Environment variable specifications
├── middleware.ts                        # Next.js edge middleware for Supabase auth refresh
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
- **Rule**: Keep business logic, database queries, and direct third-party API calls outside of `page.tsx` files. Delegate to `src/server/queries` or `src/server/actions`.
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
- **Role**: Server-only operations: direct Supabase SQL queries, PostGIS operations, and external AI service integrations.
- **Rule**: Code in this directory will never be bundled into client browser JavaScript.

---

## 3. Team Naming & Code Conventions
- **Directories**: Kebab-case (`src/components/ui`, `src/lib/supabase`).
- **Component Files**: Kebab-case (`map-container.tsx`, `rental-card.tsx`).
- **Component Functions**: PascalCase (`export function MapContainer()`).
- **Hooks**: Kebab-case prefixed with `use-` (`use-map-bounds.ts`).
- **Utilities**: Kebab-case (`src/lib/utils.ts`).
- **Path Aliases**: Always use `@/*` mapped to `src/*` (e.g. `@/components/ui/button`).
