import { Skeleton } from "@/components/ui/Skeleton";

export default function NotificationsLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-background p-4 sm:p-6 lg:p-8 text-foreground"
      role="status"
      aria-label="Loading notifications"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-4 p-3 border-b border-border/40 last:border-0 animate-pulse">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
