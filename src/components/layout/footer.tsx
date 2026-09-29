export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      <div className="container mx-auto px-4">
        <p>© {new Date().getFullYear()} AbangCebuAI Group 2. Next.js 15, Supabase, and MapLibre GL.</p>
      </div>
    </footer>
  );
}
