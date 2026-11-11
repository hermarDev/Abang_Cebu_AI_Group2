import { Skeleton } from "@/components/ui/Skeleton";

export function LandlordPropertiesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Area 1: Page Header & Primary Action */}
      <div
        data-skeleton="header"
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 space-y-1.5">
          <Skeleton
            data-skeleton="header-title"
            className="h-8 w-44 rounded-xl"
          />
          <Skeleton
            data-skeleton="header-subtitle"
            className="h-4 w-64 rounded-lg"
          />
        </div>
        <Skeleton
          data-skeleton="header-action"
          className="h-11 w-32 shrink-0 self-start rounded-full sm:self-auto"
        />
      </div>

      {/* Area 2: Filter / Navigation Chips */}
      <div
        data-skeleton="filters"
        className="flex flex-wrap gap-2 border-b border-border/80 pb-4"
      >
        <Skeleton
          data-skeleton="filter-chip"
          className="h-9 w-16 rounded-full"
        />
        <Skeleton
          data-skeleton="filter-chip"
          className="h-9 w-24 rounded-full"
        />
        <Skeleton
          data-skeleton="filter-chip"
          className="h-9 w-28 rounded-full"
        />
      </div>

      {/* Area 3: List / Content Cards */}
      <div data-skeleton="cards-list" className="grid gap-3 sm:gap-4">
        {[1, 2].map((i) => (
          <article
            key={i}
            data-skeleton="property-card"
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            {/* Left thumbnail + info */}
            <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center">
              <Skeleton
                data-skeleton="card-thumbnail"
                className="size-20 shrink-0 rounded-xl"
              />

              <div className="min-w-0 flex-1 space-y-2">
                {/* Title + Status pill */}
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton
                    data-skeleton="card-title"
                    className="h-5 w-40 rounded-md"
                  />
                  <Skeleton
                    data-skeleton="card-status"
                    className="h-5 w-20 rounded-full"
                  />
                </div>

                {/* Address */}
                <Skeleton
                  data-skeleton="card-address"
                  className="h-4 w-48 rounded"
                />

                {/* Price and property type */}
                <div className="flex items-center gap-2">
                  <Skeleton
                    data-skeleton="card-price"
                    className="h-4 w-28 rounded"
                  />
                  <span className="text-muted-foreground/30">·</span>
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              </div>
            </div>

            {/* Right / bottom action buttons */}
            <div
              data-skeleton="card-actions"
              className="flex flex-wrap items-center gap-2 sm:shrink-0"
            >
              <Skeleton
                data-skeleton="card-action-btn"
                className="h-9 w-24 rounded-full"
              />
              <Skeleton
                data-skeleton="card-action-btn"
                className="h-9 w-20 rounded-full"
              />
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function LandlordPropertiesLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-gradient-to-br from-action/5 via-background to-muted/70 pt-16 pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground lg:pb-0"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading properties"
    >
      <span className="sr-only">Loading properties…</span>

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
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 rounded px-2" />
              <Skeleton className="h-10 w-full rounded-xl bg-action/15" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <LandlordPropertiesSkeleton />
        </div>
      </div>
    </main>
  );
}
