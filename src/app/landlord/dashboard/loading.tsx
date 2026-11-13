import { Skeleton } from "@/components/ui/Skeleton";

export default function LandlordDashboardLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-gradient-to-br from-action/5 via-background to-muted/70 pt-16 pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground lg:pb-0"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading landlord dashboard"
    >
      <span className="sr-only">Loading landlord dashboard…</span>

      {/* Top Navbar Skeleton Shell */}
      <header
        className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-lg"
        aria-hidden="true"
      >
        <div className="mx-auto flex min-h-16 max-w-[1920px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-7 w-28 rounded-lg sm:w-32" />
            <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">
              Landlord workspace
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
      </header>

      {/* Layout Grid: Sidebar + Content */}
      <div className="mx-auto grid max-w-[1920px] gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-6 lg:px-8">
        {/* Sidebar Skeleton Shell */}
        <aside
          className="hidden min-h-[calc(100dvh-5rem)] self-stretch lg:flex lg:flex-col"
          aria-hidden="true"
        >
          <div className="flex min-h-0 flex-1 flex-col space-y-4 rounded-2xl border border-border bg-card p-2 shadow-sm sm:p-2.5">
            <div className="flex min-h-10 items-center justify-between px-2">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 rounded px-2" />
              <Skeleton data-skeleton="active-nav" className="h-10 w-full rounded-xl bg-action/15" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 rounded px-2" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="min-w-0 space-y-5 sm:space-y-6">
          {/* Welcome card */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-60 rounded-xl" />
                <Skeleton className="h-4 w-80 rounded-lg" />
              </div>
              <Skeleton className="h-11 w-36 rounded-xl" />
            </div>
          </div>

          {/* 4 KPI overview cards */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
                <Skeleton className="size-10 rounded-xl" />
                <Skeleton className="mt-3 h-4 w-24 rounded" />
                <Skeleton className="mt-1 h-8 w-16 rounded" />
                <Skeleton className="mt-1 h-3 w-32 rounded" />
              </div>
            ))}
          </div>

          {/* Portfolio section */}
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-6 w-36 rounded" />
              </div>
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48 rounded" />
                  <Skeleton className="h-4 w-64 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
