import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminSupportLoading() {
  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" role="status" aria-label="Loading support tickets">
      <span className="sr-only">Loading support tickets…</span>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="flex flex-wrap gap-2 pt-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-11 w-24" />
        ))}
      </div>
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
