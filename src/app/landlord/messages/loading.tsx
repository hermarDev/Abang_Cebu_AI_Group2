import { MessagesSkeleton } from "@/features/messages/MessagesSkeleton";

export default function Loading() {
  return <div role="status" aria-live="polite" aria-label="Loading messages" className="min-h-[100dvh] bg-background p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 lg:pb-6"><MessagesSkeleton /></div>;
}
