import { Skeleton } from "@/components/ui/Skeleton";

function FieldSkeleton({ label = "w-28", className = "" }: { label?: string; className?: string }) {
  return <div className={`grid gap-1.5 ${className}`}><Skeleton className={`h-4 rounded ${label}`} /><Skeleton className="h-11 w-full rounded-lg" /></div>;
}

export function ListPropertyStepSkeleton({ step = 0 }: { step?: 0 | 1 | 2 | 3 | 4 }) {
  if (step === 1) {
    return (
      <section data-skeleton="step-2" className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-11 shrink-0 rounded-xl bg-action/15" />
          <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-5 w-48 rounded-md" /><Skeleton className="h-4 w-72 max-w-full rounded-md" /></div>
        </div>
        <FieldSkeleton label="w-32" />
        <div data-skeleton="map-placeholder" className="grid h-56 place-items-center rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex flex-col items-center gap-2"><Skeleton className="size-9 rounded-full bg-action/15" /><Skeleton className="h-3.5 w-32 rounded" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldSkeleton label="w-44" className="sm:col-span-2" />
          <FieldSkeleton label="w-24" />
          <FieldSkeleton label="w-36" />
        </div>
      </section>
    );
  }
  if (step === 2) {
    return (
      <div data-skeleton="step-3" className="grid gap-4">
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="size-11 shrink-0 rounded-xl bg-action/15" />
            <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-5 w-44 rounded-md" /><Skeleton className="h-4 w-64 max-w-full rounded-md" /></div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex min-h-11 items-center gap-2.5 rounded-xl border border-border bg-background px-3"><Skeleton className="size-4 rounded" /><Skeleton className="h-4 w-28 rounded" /></div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2"><FieldSkeleton label="w-24" /><FieldSkeleton label="w-36" /></div>
        </section>
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="size-11 shrink-0 rounded-xl bg-action/15" />
            <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-5 w-36 rounded-md" /><Skeleton className="h-4 w-72 max-w-full rounded-md" /></div>
          </div>
          <div data-skeleton="photo-upload" className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 bg-card/60 p-6">
            <Skeleton className="size-12 rounded-xl bg-action/10" /><Skeleton className="h-4 w-56 max-w-full rounded" /><Skeleton className="h-3 w-40 rounded" />
          </div>
          <div data-skeleton="photo-previews" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="grid gap-1.5 rounded-xl border border-border bg-card p-2"><Skeleton className="aspect-square w-full rounded-lg" /><Skeleton className="h-3 w-full rounded" /><Skeleton className="h-8 w-full rounded-lg" /></div>
            ))}
          </div>
        </section>
      </div>
    );
  }
  if (step === 3) {
    return (
      <section data-skeleton="step-4" className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-11 shrink-0 rounded-xl bg-action/15" />
          <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-5 w-56 max-w-full rounded-md" /><Skeleton className="h-4 w-72 max-w-full rounded-md" /></div>
        </div>
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5"><Skeleton className="h-4 w-48 rounded" /><Skeleton className="h-3 w-full rounded" /><Skeleton className="h-3 w-4/5 rounded" /></div>
        <div data-skeleton="document-upload" className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 bg-card/60 p-6">
          <Skeleton className="size-12 rounded-xl bg-action/10" /><Skeleton className="h-4 w-60 max-w-full rounded" /><Skeleton className="h-3 w-44 rounded" />
        </div>
        <div data-skeleton="document-previews" className="grid gap-2 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
              <div className="flex min-w-0 flex-1 items-center gap-2"><Skeleton className="size-12 shrink-0 rounded" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-28 rounded" /><Skeleton className="h-3 w-20 rounded" /></div></div>
              <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (step === 4) {
    return (
      <section data-skeleton="step-5" className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-11 shrink-0 rounded-xl bg-action/15" />
          <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-5 w-44 rounded-md" /><Skeleton className="h-4 w-72 max-w-full rounded-md" /></div>
        </div>
        <div data-skeleton="review-cards" className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3"><Skeleton className="h-3 w-24 rounded" /><Skeleton className="h-4 w-36 rounded" /></div>
          ))}
          <div data-skeleton="listing-summary" className="space-y-2 rounded-xl border border-border p-3 sm:col-span-2"><Skeleton className="h-3 w-20 rounded" /><Skeleton className="h-4 w-64 max-w-full rounded" /><Skeleton className="h-3.5 w-44 rounded" /></div>
          <div data-skeleton="review-photos" className="space-y-2 rounded-xl border border-border p-3 sm:col-span-2">
            <Skeleton className="h-3 w-16 rounded" />
            <div className="flex flex-wrap gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="size-12 rounded-lg" />)}</div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section data-skeleton="step-1" className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 shrink-0 rounded-xl bg-action/15" />
        <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-5 w-40 rounded-md" /><Skeleton className="h-4 w-64 max-w-full rounded-md" /></div>
      </div>
      <FieldSkeleton />
      <div className="grid gap-1.5"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-3 w-64 max-w-full rounded" /><Skeleton className="h-28 w-full rounded-lg" /></div>
      <FieldSkeleton />
      <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2"><Skeleton className="h-4 w-32 rounded" /><Skeleton className="h-4 w-72 max-w-full rounded" /></div>
        <FieldSkeleton label="w-20" />
        <FieldSkeleton label="w-36" />
        <FieldSkeleton label="w-32" className="sm:col-span-2" />
      </div>
    </section>
  );
}

export function ListPropertySkeleton({ step = 0 }: { step?: 0 | 1 | 2 | 3 | 4 }) {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4">
      <Skeleton className="h-11 w-44 rounded-lg" />
      <section className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <Skeleton className="h-8 w-56 rounded-xl" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full rounded-lg" />
      </section>
      <section data-skeleton="stepper" className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-4 w-32 rounded" /></div>
        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-action/40" style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>
        <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className={`h-9 rounded-lg ${i === step ? "bg-action/15" : ""}`} />)}
        </div>
      </section>
      <ListPropertyStepSkeleton step={step} />
    </div>
  );
}
