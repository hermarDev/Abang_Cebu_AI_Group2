import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminDashboardLoading() {
  return (
    <div
      className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto"
      role="status"
      aria-label="Loading admin dashboard"
    >
      <span className="sr-only">Loading admin dashboard…</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-6 border-b border-border/80">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/70 bg-muted/40 p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between border-b border-border/60 pb-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
