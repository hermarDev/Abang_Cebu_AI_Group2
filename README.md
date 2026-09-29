# AbangCebuAI 🏝️🤖

An intelligent, AI-enhanced geospatial rental and property discovery platform in Cebu, Philippines.

Built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **Supabase (PostgreSQL & PostGIS)**, and **MapLibre GL**.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend / Database**: [Supabase](https://supabase.com/) (`@supabase/ssr`, PostgreSQL, RLS)
- **Geospatial & Mapping**: [MapLibre GL](https://maplibre.org/)
- **Package Manager**: [pnpm](https://pnpm.io/)

---

## 📁 Architecture & Documentation

Comprehensive architectural guidelines are located in [`docs/`](./docs):

- **[Project Directory Architecture & Ownership](./docs/project-structure.md)**: File tree conventions, module responsibilities, and team boundaries.
- **[Client vs. Server Component Boundaries](./docs/client-server-boundaries.md)**: WebGL isolation pattern for MapLibre GL, preventing SSR memory leaks, and RSC data flow.
- **[Next.js 15 & React 19 Guidelines](./docs/next15-guidelines.md)**: Asynchronous `cookies()` / `params`, caching defaults (`no-store`), and Supabase SSR integration.

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
