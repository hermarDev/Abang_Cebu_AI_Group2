import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <main className="min-h-[100dvh] bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8" role="status" aria-live="polite">
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <p className="text-sm font-medium text-muted-foreground">Loading account settings…</p>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  </main>;
}
