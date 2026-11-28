"use client";

export function SupportTicketReplies({
  supportResolutionNote,
  adminResponse,
  emptyMessage,
}: {
  supportResolutionNote?: string | null;
  adminResponse?: string | null;
  emptyMessage?: string;
}) {
  if (!supportResolutionNote && !adminResponse) {
    return emptyMessage ? <p className="m-0 text-muted-foreground">{emptyMessage}</p> : null;
  }

  return (
    <>
      {supportResolutionNote && (
        <div className="rounded-lg border border-border/80 bg-muted/50 p-2.5">
          <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-action">
            Customer Support resolution
          </p>
          <p className="m-0 mt-1 whitespace-pre-wrap text-foreground leading-relaxed">
            {supportResolutionNote}
          </p>
        </div>
      )}
      {adminResponse && (
        <div className="rounded-lg border border-border/80 bg-muted/50 p-2.5">
          <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-action">
            Admin response
          </p>
          <p className="m-0 mt-1 whitespace-pre-wrap text-foreground leading-relaxed">
            {adminResponse}
          </p>
        </div>
      )}
    </>
  );
}

export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTicketDate(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return iso;
  }
}
