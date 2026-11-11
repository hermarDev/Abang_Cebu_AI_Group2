import { Skeleton } from "@/components/ui/Skeleton";
import { ListPropertySkeleton } from "./ListPropertySkeleton";

export default function ListPropertyLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-gradient-to-br from-action/5 via-background to-muted/70 pt-16 pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground lg:pb-0"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading property listing form"
    >
      <span className="sr-only">Loading property listing form…</span>

      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-lg" aria-hidden="true">
        <div className="mx-auto flex min-h-16 max-w-[1920px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-7 w-28 rounded-lg sm:w-32" />
            <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">Landlord workspace</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1920px] gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-6 lg:px-8">
        <aside className="hidden min-h-[calc(100dvh-5rem)] self-stretch lg:flex lg:flex-col" aria-hidden="true">
          <div className="flex min-h-0 flex-1 flex-col space-y-4 rounded-2xl border border-border bg-card p-2 shadow-sm sm:p-2.5">
            <div className="flex min-h-10 items-center justify-between px-2">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton data-skeleton="active-nav" className="h-10 w-full rounded-xl bg-action/15" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5 sm:space-y-6">
          <ListPropertySkeleton />
        </div>
      </div>
    </main>
  );
}
