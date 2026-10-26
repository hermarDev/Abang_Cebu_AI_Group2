# AbangCebuAI

AbangCebuAI is a rental discovery project for Cebu, Philippines. The application combines a map, rental filters and place search with Supabase authentication and listing data.

## Project status

The finder runs on the home route (`/`). It reads published, available listings from Supabase. Place search uses Photon; the map uses MapLibre GL with OpenFreeMap styling and OpenStreetMap-derived data.

The documentation also describes planned renter, landlord, moderation and AI-assistant workflows. A specification or wireframe does not mean that workflow is implemented or deployed. Check the source and the pull request for the branch you are using.

Current limitations include a 200-record limit on the rentals endpoint and process-local place-search caching. Cached place results are not shared between server instances. Sample rentals are fictional and must not be presented as live offers.

## Stack

- Next.js 16 App Router, React 19 and TypeScript
- Tailwind CSS v4 and CSS modules
- Supabase Auth and PostgreSQL, with PostGIS migrations and row-level security
- MapLibre GL, OpenFreeMap and Photon
- Vitest for unit tests

Use Node.js 22, matching CI, and pnpm 10.33.0, pinned in `package.json`.

## Local setup

```bash
git clone https://github.com/hermarDev/Abang_Cebu_AI_Group2.git
cd Abang_Cebu_AI_Group2
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Do not overwrite an existing environment file. Set these values for your development Supabase project:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key; access still depends on RLS |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Map style path; use `/styles/osm.json` for the included style |
| `NEXT_PUBLIC_SITE_URL` | Canonical application origin used by password recovery; use HTTPS in production |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public Cloudflare Turnstile site key for verification widgets |
| `TURNSTILE_SECRET_KEY` | Server-only Turnstile verification secret |

The environment template may not list every authentication variable above. Add the values needed for the flow you are testing. Production registration and recovery verify Turnstile tokens; local development does not establish that hosted bot protection works. Configure allowed hostnames, Supabase Site URL and redirect allowlists for the environment. See the [password recovery implementation guide](docs/specifications/auth/password-reset-implementation.md).

Never put a service-role key in a `NEXT_PUBLIC_*` variable or browser code. Normal browser access uses the anonymous key with RLS. Do not commit environment files or copy production credentials into test fixtures.

### Database

Use a separate development Supabase project or an approved local Supabase instance. Review the ordered SQL files in [`supabase/migrations`](supabase/migrations) and the [database setup guidance](docs/database/supabase-architecture.md) before applying them. Application configuration alone does not create the tables or policies.

The repository includes [`supabase/seed.sql`](supabase/seed.sql); inspect it before using it in a disposable development database. Do not reset, seed or migrate a shared or production database without approval. Hosted email delivery, callback URLs and deployed RLS require separate verification.

### Start the application

```bash
pnpm dev
```

Open [localhost:3000](http://localhost:3000). The map finder is on `/`, not `/map`. External map and search services require network access. If rentals are empty, confirm that the development database contains published, available listings visible under its RLS policies.

## Checks

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Use `pnpm test:watch` while developing. After a successful build, `pnpm start` runs the production server locally.

Some development branches include Playwright browser tests. Use their checked-in configuration and scripts when available; do not assume those tools exist on every branch. Unit tests and a successful build do not verify live email delivery, deployed database policies or production performance.

## Documentation

- [Documentation index](docs/README.md)
- [Project structure](docs/architecture/project-structure.md)
- [Next.js and React guidelines](docs/architecture/next15-guidelines.md)
- [Client and server boundaries](docs/architecture/client-server-boundaries.md)
- [Database architecture](docs/database/database-erd.md)
- [Environment and secrets guidance](docs/security/environment-variables.md)
- [Authentication test plan](docs/testing/auth-test-plan.md)
- [Contributing](CONTRIBUTING.md)

Treat design documents and test plans as requirements unless they include explicit implementation or execution evidence.
