# Next.js 16 & React 19 Development Guidelines

## 1. Asynchronous Request APIs
In Next.js 16, request-specific dynamic data (`params`, `searchParams`, `cookies()`, and `headers()`) is asynchronous and must be awaited.

### `params` and `searchParams` in Page Props
```tsx
// ❌ Next.js 14 Syntax (Will error or throw deprecation warnings in 15)
export default function Page({ params }: { params: { id: string } }) {
  return <div>Listing {params.id}</div>;
}

// ✅ Next.js 16 Syntax (Required)
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  return <div>Listing {id}</div>;
}
```

### `cookies()` and `headers()`
```tsx
import { cookies, headers } from 'next/headers';

export async function ServerComponent() {
  // ✅ Must await in Next.js 16
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  const headerList = await headers();
  const userAgent = headerList.get('user-agent');
}
```

---

## 2. Fetch Caching Defaults
- In Next.js 14, `fetch()` calls were cached by default (`force-cache`).
- In Next.js 16, the default is `auto no cache`: requests are fetched when needed during request rendering, but may be fetched once during build when a route is statically prerendered. Request-time APIs make the route fetch on each request.
- Use `cache: 'no-store'` to bypass the framework cache on every request; use `cache: 'force-cache'` for a persistent cached response.

```tsx
// Default: auto no cache (Next.js 16)
const liveData = await fetch('https://api.example.com/listings');

// Explicitly uncached on every request:
const freshData = await fetch('https://api.example.com/live-listings', {
  cache: 'no-store',
});

// Explicit persistent caching:
const staticData = await fetch('https://api.example.com/cebu-zones', {
  cache: 'force-cache',
});

// Incremental Static Regeneration (ISR):
const revalidatedData = await fetch('https://api.example.com/prices', {
  next: { revalidate: 3600 }, // Revalidate every hour
});
```

---

## 3. React 19 Standards
Next.js 16 ships with React 19.

### Direct `ref` Support (No `forwardRef` needed)
In React 19, `ref` is passed directly as a standard prop to functional components:
```tsx
// ✅ React 19: Clean direct ref prop
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({ ref, ...props }: InputProps) {
  return <input ref={ref} {...props} />;
}
```

### Actions & Form State
- Deprecated: `useFormState` (React 18)
- **Standard**: `useActionState` (React 19)

---

## 4. Supabase SSR Integration with Next.js 16
Because Next.js 16 makes `cookies()` asynchronous, Supabase's server client factory must await the cookie store before defining `getAll()` and `setAll()`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when invoked from Server Component (handled by middleware)
          }
        },
      },
    }
  );
}
```

---

## 5. Development with Turbopack
Turbopack is the default dev bundler:
```bash
pnpm dev --turbopack
```
Fast refresh, instant module replacement, and strict TypeScript validation during build.
