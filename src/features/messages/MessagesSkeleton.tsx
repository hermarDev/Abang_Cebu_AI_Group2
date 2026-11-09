import { Skeleton } from "@/components/ui/Skeleton";

export function MessagesSkeleton() {
  return <div className="grid h-full min-h-[30rem] overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[340px_minmax(0,1fr)]">
    <div className="grid content-start gap-1 p-2 lg:border-r lg:border-border">
      <Skeleton className="mb-1 h-11 w-full" />
      {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
    </div>
    <div className="hidden content-end gap-3 p-4 lg:grid">
      <Skeleton className="h-14 w-3/4" /><Skeleton className="ml-auto h-14 w-2/3" /><Skeleton className="h-14 w-1/2" /><Skeleton className="h-12 w-full" />
    </div>
  </div>;
}
