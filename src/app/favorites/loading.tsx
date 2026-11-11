import { Skeleton } from "@/components/ui/Skeleton";

export default function FavoritesLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-background p-4 sm:p-6 lg:p-8 text-foreground"
      role="status"
      aria-label="Loading saved rentals"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <span className="sr-only">Loading your saved rentals…</span>
          {[0, 1, 2].map((index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="grid gap-2 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
