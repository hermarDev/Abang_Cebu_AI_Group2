import { Skeleton } from "./Skeleton";

export interface RouteLoadingProps {
  label: string;
  className?: string;
}

/**
 * Shared route fallback. Uses a native indeterminate <progress> for assistive
 * tech instead of an aria-live "Loading…" announcement.
 */
export function RouteLoading({ label, className }: RouteLoadingProps) {
  return (
    <main
      aria-busy="true"
      className={`min-h-[100dvh] bg-background px-4 pt-20 pb-8 text-foreground sm:px-6 lg:px-8 ${className ?? ""}`}
    >
      <progress aria-label={label} className="sr-only" />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
