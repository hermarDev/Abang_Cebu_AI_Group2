import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <main className="min-h-[100dvh] bg-background text-foreground" role="status" aria-live="polite">
    <div className="border-b border-border/70 px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Skeleton className="h-11 w-44" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:px-8">
      <div className="grid gap-2">
        <p className="text-sm font-medium text-muted-foreground">Loading account settings…</p>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.85fr)]">
        <Skeleton className="h-96 w-full rounded-2xl" />
        <div className="grid gap-6">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  </main>;
}