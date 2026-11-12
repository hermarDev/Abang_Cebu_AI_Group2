import { formatAdminDate } from "./admin-api";
import { Badge } from "@/components/ui/Badge";
import { CircleAlert, CheckCircle2, FileText, Trash2, UserRound, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/components/ui/cn";

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

function getActionBadge(actionType?: string) {
  const type = (actionType ?? "").toLowerCase();
  if (type.includes("approve")) return { label: "Approved", variant: "success" as const, icon: CheckCircle2 };
  if (type.includes("reject")) return { label: "Rejected", variant: "destructive" as const, icon: CircleAlert };
  if (type.includes("suspend")) return { label: "Suspended", variant: "destructive" as const, icon: UserRound };
  if (type.includes("reinstate")) return { label: "Reinstated", variant: "success" as const, icon: CheckCircle2 };
  if (type.includes("unpublish")) return { label: "Unpublished", variant: "warning" as const, icon: AlertTriangle };
  if (type.includes("restore")) return { label: "Restored", variant: "success" as const, icon: CheckCircle2 };
  if (type.includes("resolve")) return { label: "Resolved", variant: "success" as const, icon: CheckCircle2 };
  if (type.includes("dismiss")) return { label: "Dismissed", variant: "secondary" as const, icon: CircleAlert };
  if (type.includes("delete") || type.includes("remove")) return { label: "Deleted", variant: "destructive" as const, icon: Trash2 };
  if (type.includes("create")) return { label: "Created", variant: "default" as const, icon: FileText };
  if (type.includes("update")) return { label: "Updated", variant: "default" as const, icon: FileText };
  return { label: actionType?.replace(/_/g, " ") ?? "Action", variant: "default" as const, icon: FileText };
}

function formatStateValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function diffStates(prev: unknown, next: unknown): Array<{ key: string; prev: unknown; next: unknown; type: "added" | "removed" | "changed" | "unchanged" }> {
  const prevObj = prev && typeof prev === "object" ? prev as Record<string, unknown> : {};
  const nextObj = next && typeof next === "object" ? next as Record<string, unknown> : {};
  const keys = new Set([...Object.keys(prevObj), ...Object.keys(nextObj)]);
  return Array.from(keys).map((key) => {
    const prevVal = prevObj[key];
    const nextVal = nextObj[key];
    const prevExists = key in prevObj;
    const nextExists = key in nextObj;
    if (!prevExists && nextExists) return { key, prev: undefined, next: nextVal, type: "added" as const };
    if (prevExists && !nextExists) return { key, prev: prevVal, next: undefined, type: "removed" as const };
    if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) return { key, prev: prevVal, next: nextVal, type: "changed" as const };
    return { key, prev: prevVal, next: nextVal, type: "unchanged" as const };
  });
}

function StateDiff({ previousState, newState }: { previousState?: unknown; newState?: unknown }) {
  const diffs = diffStates(previousState, newState);
  const hasChanges = diffs.some((d) => d.type !== "unchanged");
  
  if (!hasChanges) {
    return <p className="text-xs text-muted-foreground">No state changes</p>;
  }

  return (
    <div className="space-y-1.5">
      {diffs
        .filter((d) => d.type !== "unchanged")
        .map((d, i) => (
          <div key={i} className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold",
                d.type === "added" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                d.type === "removed" && "bg-destructive/10 text-destructive",
                d.type === "changed" && "bg-warning/10 text-warning"
              )}>
                {d.type === "added" && <CheckCircle2 size={10} />}
                {d.type === "removed" && <Trash2 size={10} />}
                {d.type === "changed" && <ArrowRight size={10} />}
              </span>
              <span className="font-medium text-foreground">{d.key}</span>
            </div>
            <div className="grid gap-1 ml-7">
              {d.type !== "added" && (
                <div className="text-destructive/70 dark:text-destructive/50">
                  <span className="text-muted-foreground">− </span>{formatStateValue(d.prev)}
                </div>
              )}
              {d.type !== "removed" && (
                <div className="text-emerald-600/70 dark:text-emerald-400/50">
                  <span className="text-muted-foreground">+ </span>{formatStateValue(d.next)}
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}

export function AdminAuditEntries({ entries }: { entries: AuditEntry[] }) {
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {entries.map((entry, index) => {
        const action = getActionBadge(entry.actionType);
        const Icon = action.icon;
        return (
          <li key={entry.id ?? index} className="rounded-xl border border-border bg-card p-4 transition hover:border-action/30 hover:shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-action/10 text-action">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="m-0 font-semibold text-foreground">{action.label}</p>
                  <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                    {entry.adminName ?? "Unknown admin"} · {entry.targetType ?? "target"}
                    <span className="mx-1.5">·</span>
                    <span className="font-mono break-all">{entry.targetId}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px]">{entry.targetType ?? "target"}</Badge>
                <time dateTime={entry.createdAt} className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatAdminDate(entry.createdAt)}
                </time>
              </div>
            </div>
            {entry.reason && (
              <p className="mt-3 text-sm text-foreground">
                <span className="font-medium text-muted-foreground">Reason: </span>{entry.reason}
              </p>
            )}
            {(entry.previousState !== undefined || entry.newState !== undefined) && (
              <div className="mt-3">
                <StateDiff previousState={entry.previousState} newState={entry.newState} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
