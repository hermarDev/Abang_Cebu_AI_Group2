import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <main className="min-h-[100dvh] bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:pl-28" role="status" aria-live="polite" aria-label="Loading...">
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <p className="text-sm font-medium text-muted-foreground">Loading landlord workspace…</p>
      <Skeleton className="h-32 w-full sm:h-40" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36 w-full" />)}
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  </main>;
}
