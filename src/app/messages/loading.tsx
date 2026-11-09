import { Skeleton } from "@/components/ui/Skeleton";
import { MessagesSkeleton } from "@/features/messages/MessagesSkeleton";

export default function Loading() {
  return <main className="flex h-[100dvh] flex-col bg-background text-foreground" role="status" aria-live="polite" aria-label="Loading messages">
    <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border px-4 sm:px-6"><Skeleton className="h-8 w-32" /><Skeleton className="h-11 w-28" /></div>
    <div className="min-h-0 flex-1 p-3 sm:p-6"><MessagesSkeleton /></div>
  </main>;
}
