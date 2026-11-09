import { formatAdminDate } from "./admin-api";

export type AuditEntry = {
  id?: string;
  actionType?: string;
  adminName?: string | null;
  targetType?: string;
  targetId?: string;
  reason?: string | null;
  createdAt?: string;
  previousState?: unknown;
  newState?: unknown;
};

const state = (value: unknown) => (value === null || value === undefined ? "—" : JSON.stringify(value));

export function AdminAuditEntries({ entries }: { entries: AuditEntry[] }) {
  return <ul className="m-0 grid list-none gap-3 p-0">
    {entries.map((entry, index) => <li key={entry.id ?? index} className="rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="m-0 font-semibold">{(entry.actionType ?? "action").replace(/_/g, " ")}</p>
        <time dateTime={entry.createdAt} className="text-xs text-muted-foreground">{formatAdminDate(entry.createdAt)}</time>
      </div>
      <p className="mb-0 mt-1 text-muted-foreground">{entry.adminName ?? "Unknown admin"} · {entry.targetType ?? "target"} <span className="break-all">{entry.targetId}</span></p>
      {entry.reason && <p className="mb-0 mt-2">Reason: {entry.reason}</p>}
      <p className="mb-0 mt-2 break-all font-mono text-xs text-muted-foreground">{state(entry.previousState)} → {state(entry.newState)}</p>
    </li>)}
  </ul>;
}
