import { Skeleton } from "@/components/ui/Skeleton";

export default function HelpLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <p className="sr-only">Loading Help Center…</p>
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-full" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
