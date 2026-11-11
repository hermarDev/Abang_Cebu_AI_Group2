export default function RootLoading() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="fixed inset-x-0 top-0 z-50 pointer-events-none"
    >
      <div className="h-1 w-full bg-muted/40 overflow-hidden">
        <div className="h-full w-full bg-action animate-pulse" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
