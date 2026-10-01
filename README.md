# AbangCebuAI

An intelligent, AI-enhanced geospatial rental and property discovery platform in Cebu, Philippines.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Supabase (PostgreSQL & PostGIS)**, **MapLibre GL**, and **OpenStreetMap**.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend / Database**: [Supabase](https://supabase.com/) (`@supabase/ssr`, PostgreSQL, RLS)
- **Geospatial & Mapping**: [MapLibre GL](https://maplibre.org/) & [OpenStreetMap](https://www.openstreetmap.org/) (via [`public/styles/osm.json`](./public/styles/osm.json))
- **Package Manager**: [pnpm](https://pnpm.io/)

---

## 📁 Architecture & Documentation

Comprehensive architectural guidelines, specifications, and QA test matrices are centralized in the **[Engineering Documentation Hub (`docs/README.md`)](./docs/README.md)**:

### 🏛️ System Architecture & Framework Standards
- **[Platform Vision & System Boundaries](./docs/architecture/what-is-abangcebu-ai.md)**: High-level product vision, actor capabilities, and technical boundaries.
- **[Project Directory Architecture & Ownership](./docs/architecture/project-structure.md)**: Directory tree conventions, module responsibilities, and team boundaries.
- **[Next.js 16 & React 19 Guidelines](./docs/architecture/next15-guidelines.md)**: Asynchronous `cookies()` / `params`, caching defaults (`no-store`), and Supabase SSR integration.
- **[Client vs. Server Component Boundaries](./docs/architecture/client-server-boundaries.md)**: WebGL isolation pattern for MapLibre GL, preventing SSR memory leaks, and RSC data flow.
- **[Git Branching & PR Collaboration Strategy](./docs/architecture/git-workflow.md)**: Team branch standards (`feature/*`, `fix/*`), PR checklist template, and peer review workflow.
- **[Team Contribution & Forking Workflow](./CONTRIBUTING.md)**: Step-by-step guide for forking, branching, and submitting Pull Requests for review.

### 🗄️ Database & Schema Design
- **[Database ERD Architecture](./docs/database/database-erd.md)**: 11-entity relational data model in 3NF with PostGIS spatial extensions.
- **[Users & Profiles Table Schema Specification](./docs/database/users-and-profiles-schema.md)**: DDL specifications for `profiles`, roles, and KYC verifications.
- **[Supabase Database Architecture & Extensions](./docs/database/supabase-architecture.md)**: Required extensions (PostGIS, UUID), CLI migration strategy, and connection pooling.

### 🛡️ Security & Authorization
- **[Role-Based Access Control (RBAC) Matrix](./docs/security/rbac-matrix.md)**: Comprehensive role-to-permission mapping across guest, renter, landlord, and admin.
- **[Row Level Security (RLS) Policy Specifications](./docs/security/rls-policies.md)**: PostgreSQL RLS policies enforcing tenant isolation and authorization.
- **[Environment Variables & Secrets Governance](./docs/security/environment-variables.md)**: Client (`NEXT_PUBLIC_*`) vs Server variables, zero-leak policy, and local setup guide.

### 📋 Functional Specification Documents (FSD)
- **[User Registration Workflow & Data Contract](./docs/specifications/auth/auth-registration-spec.md)**: Zero-trust registration contracts, PKCE validation, and anti-abuse defense.
- **[User Login & Session Token Lifecycle](./docs/specifications/auth/auth-session-lifecycle.md)**: Token rotation, cookie chunking, and Edge middleware session validation.
- **[User Logout & Session Invalidation](./docs/specifications/auth/auth-logout-spec.md)**: Multi-tab session synchronization and secure cookie disposal.
- **[Password Reset & Recovery Workflow](./docs/specifications/auth/auth-password-reset-spec.md)**: Anti-enumeration recovery, OTP verification, and session revocation.
- **[Authentication Error Handling & Edge Cases](./docs/specifications/auth/auth-error-handling.md)**: Canonical JSON error taxonomy and UX presentation matrix.

### 🎨 UI Design System & Wireframe Blueprints
- **[UI Framework & Styling Guidelines](./docs/design/styling-guidelines.md)**: Tailwind CSS v4 design tokens, Cebu coastal palette, and WCAG 2.2 AA accessibility.
- **[Renter Persona & Access Rights](./docs/design/renter-persona.md)**: "Mika" student/young professional renter profile and spatial journey map.
- **[Landing Page Wireframes & Specifications](./docs/design/landing-page-wireframe.md)**: 1440px desktop split layout & 390px mobile map-first bottom-sheet viewports.
- **[Mobile Map Viewport & Bottom Sheet](./docs/design/mobile-map-wireframes.md)**: 3-snap bottom sheet mechanics (peek 88px, mid 48dvh, full 88dvh).
- **[Authentication & Dashboard Wireframe Specs](./docs/design/login-page-wireframe.md)**: Login, registration, renter dashboard, profile, and admin dashboard specs.

### 🧪 Quality Assurance & Performance Testing
- **[Authentication QA Test Plan](./docs/testing/auth-test-plan.md)**: 36 formulated test scenarios and master QA test execution matrix.
- **[Role & Access Verification Test Cases](./docs/testing/rbac-test-cases.md)**: 30 RBAC test scenarios across 6 test suites.
- **[Protected Route & Middleware Test Scenarios](./docs/testing/middleware-test-scenarios.md)**: 35 Edge runtime middleware protection scenarios.
- **[Authentication Baseline Latency & Load Strategy](./docs/testing/auth-performance-baseline.md)**: P50/P95/P99 latency thresholds, k6 load scripts, and connection pool sizing.
- **[Formal Architecture PDFs](./docs/pdf/)**: Standalone compiled PDF deliverables for all engineering specifications.

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js `v20+` or `v22+`
- `pnpm` (`v10+`)

### 2. Installation
```bash
git clone https://github.com/hermarDev/Abang_Cebu_AI_Group2.git
cd Abang_Cebu_AI_Group2
pnpm install
```

### 3. Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Running the Development Server
```bash
pnpm dev --turbopack
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
Visit [http://localhost:3000/map](http://localhost:3000/map) to view the interactive spatial Map Explorer centered on Cebu City.

---

## 🧪 Quality Scripts

```bash
# Type check without emitting files
pnpm tsc --noEmit

# Run ESLint
pnpm lint

# Production build test
pnpm build

# Start production server
pnpm start
```
