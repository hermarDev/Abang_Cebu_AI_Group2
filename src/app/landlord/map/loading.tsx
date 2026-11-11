import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <main className="min-h-[100dvh] bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground lg:pb-0" role="status" aria-live="polite" aria-label="Loading...">
    <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-11 w-28" />
    </div>
    <div className="relative h-[calc(100dvh-4rem)] w-full">
      <Skeleton className="size-full rounded-none" />
      <p className="absolute left-4 top-4 rounded-lg bg-card px-3 py-2 text-sm font-medium text-muted-foreground">Loading property map…</p>
      <Skeleton className="absolute bottom-4 left-4 right-4 h-64 bg-card md:bottom-auto md:right-auto md:top-16 md:h-[60%] md:w-96" />
    </div>
  </main>;
}
