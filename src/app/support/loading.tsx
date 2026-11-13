import { Skeleton } from "@/components/ui/Skeleton";

export default function SupportLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <p className="sr-only">Loading Contact Support…</p>
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
          {/* Form Skeleton */}
          <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 sm:p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
            <div className="flex justify-end">
              <Skeleton className="h-11 w-32 rounded-lg" />
            </div>
          </div>

          {/* Sidebar / History Skeleton */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3 sm:p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
