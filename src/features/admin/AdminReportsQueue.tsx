"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { notify } from "@/components/ui/AppToaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { AdminReasonField } from "./AdminReasonField";
import { adminCall, formatAdminDate, newOperationId, reasonProblem } from "./admin-api";
import { statusBadgeVariant } from "./status-badge";

export type EvidenceMessage = { id: string; senderId: string; body: string; createdAt: string; reported?: boolean };
export type AdminReport = {
  id: string;
  reporterName?: string | null;
  targetType: string;
  targetUserId?: string | null;
  targetUserName?: string | null;
  category: string;
  details: string;
  status: string;
  resolutionNote?: string | null;
  createdAt: string;
  evidenceSnapshot?: { messages?: EvidenceMessage[]; listing?: { title?: string; status?: string } } | null;
};
type Decision = "resolved" | "dismissed";
type Dialog = { report: AdminReport; decision: Decision; operationId: string };

const tabs = [{ value: "open", label: "Open" }, { value: "resolved", label: "Resolved" }, { value: "dismissed", label: "Dismissed" }, { value: "all", label: "All" }];
const label = (value: string) => value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const isClosed = (status: string) => status === "resolved" || status === "dismissed";

export const inspectReport = (userId: string, reportId: string) =>
  adminCall<{ report?: AdminReport }>(`/api/admin/reports/${reportId}?operationId=${newOperationId()}`, userId);

export const submitReportDecision = (userId: string, { report, decision, operationId }: Dialog, note: string, suspend: boolean, unpublish: boolean) =>
  adminCall<unknown>(`/api/admin/reports/${report.id}`, userId, {
    operationId, decision, resolutionNote: note.trim(),
    suspendTargetUser: decision === "resolved" && suspend, unpublishTargetListing: decision === "resolved" && unpublish,
  });

export function ReportRow({ report, onInspect, onDecide }: { report: AdminReport; onInspect: (report: AdminReport) => void; onDecide: (report: AdminReport, decision: Decision) => void }) {
  return <li className="grid gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-action/30">
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={report.category === "harassment" || report.category === "scam" || report.category === "safety" ? "destructive" : "outline"}>{label(report.category)}</Badge>
      <Badge variant={statusBadgeVariant(report.status)}>{label(report.status)}</Badge>
      <span className="text-sm text-muted-foreground">{label(report.targetType)} report · {formatAdminDate(report.createdAt)}</span>
    </div>
    <p className="m-0 text-sm text-muted-foreground">
      Reporter: <span className="font-medium text-foreground">{report.reporterName?.trim() || "Unknown"}</span>
      {" · "}Reported: <span className="font-medium text-foreground">{report.targetUserName?.trim() || "Unknown"}</span>
    </p>
    <p className="m-0 whitespace-pre-wrap break-words">{report.details}</p>
    {report.resolutionNote && <p className="m-0 text-sm text-muted-foreground">Resolution note: {report.resolutionNote}</p>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => onInspect(report)}>Inspect evidence</Button>
      {!isClosed(report.status) && <>
        <Button size="sm" variant="primary" onClick={() => onDecide(report, "resolved")}>Resolve</Button>
        <Button size="sm" variant="outline" onClick={() => onDecide(report, "dismissed")}>Dismiss</Button>
      </>}
    </div>
  </li>;
}

export function EvidenceView({ report }: { report: AdminReport }) {
  const messages = report.evidenceSnapshot?.messages ?? [];
  const listing = report.evidenceSnapshot?.listing;
  return <div className="grid gap-3">
    <Alert variant="info">Viewing this evidence is recorded in the admin audit log. Only the messages captured at report time are shown.</Alert>
    {listing && <p className="m-0 text-sm">Listing: <span className="font-medium">{listing.title ?? "Untitled"}</span> ({listing.status ?? "unknown"})</p>}
    {messages.length === 0 ? !listing && <Empty>No message evidence was captured for this report.</Empty>
      : <ol className="m-0 grid list-none gap-2 p-0">{messages.map((m) => <li key={m.id} className={`rounded-lg border p-3 text-sm ${m.reported ? "border-destructive" : "border-border"}`}>
        <p className="m-0 text-xs text-muted-foreground">{m.senderId === report.targetUserId ? "Reported user" : "Reporter"} · {formatAdminDate(m.createdAt)}{m.reported ? " · Reported message" : ""}</p>
        <p className="m-0 mt-1 whitespace-pre-wrap break-words">{m.body}</p>
      </li>)}</ol>}
  </div>;
}

export function AdminReportsQueue({ userId, initialStatus }: { userId: string; initialStatus?: string }) {
  const [status, setStatus] = useState(tabs.some((t) => t.value === initialStatus) ? initialStatus! : "open");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [evidence, setEvidence] = useState<AdminReport | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [note, setNote] = useState("");
  const [suspend, setSuspend] = useState(false);
  const [unpublish, setUnpublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    (async () => {
      setReports(null);
      setError(null);
      const result = await adminCall<{ reports?: AdminReport[] }>(`/api/admin/reports?status=${status}`, userId, undefined, abort.signal);
      if (abort.signal.aborted) return;
      if (result.ok) setReports(Array.isArray(result.data.reports) ? result.data.reports : []);
      else { setError(result.message); notify("error", "admin-reports-load", result.message); }
    })();
    return () => abort.abort();
  }, [status, userId, reloadKey]);

  async function inspect(report: AdminReport) {
    const result = await inspectReport(userId, report.id);
    if (result.ok && result.data.report) setEvidence(result.data.report);
    else notify("error", "admin-report-evidence", result.ok ? "Evidence could not be loaded." : result.message);
  }
  const decide = (report: AdminReport, decision: Decision) => { setDialog({ report, decision, operationId: newOperationId() }); setNote(""); setSuspend(false); setUnpublish(false); setDialogError(null); };
  const close = () => { if (!saving) setDialog(null); };

  async function confirm() {
    if (!dialog || saving || reasonProblem(note, 5)) return;
    setSaving(true);
    setDialogError(null);
    const result = await submitReportDecision(userId, dialog, note, suspend, unpublish);
    setSaving(false);
    if (!result.ok) { setDialogError(result.message); notify("error", "admin-report-decision", result.message); return; }
    const done = dialog;
    setDialog(null);
    setReports((list) => list?.filter((r) => r.id !== done.report.id) ?? list);
    notify("success", "admin-report-decision", done.decision === "resolved" ? "Report resolved." : "Report dismissed.");
    if (status === "all") setReloadKey((k) => k + 1);
  }

  const resolving = dialog?.decision === "resolved";
  const totalPages = reports ? Math.max(1, Math.ceil(reports.length / pageSize)) : 1;
  const validPage = Math.min(page, totalPages);
  const paginatedReports = reports ? reports.slice((validPage - 1) * pageSize, validPage * pageSize) : [];

  return <section aria-label="Abuse reports" className="grid gap-4">
    <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
      {tabs.map((t) => <Button key={t.value} size="sm" variant={status === t.value ? "primary" : "outline"} aria-pressed={status === t.value} onClick={() => { setStatus(t.value); setPage(1); }}>{t.label}</Button>)}
    </div>
    {error ? <Alert variant="error">{error} <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button></Alert>
      : reports === null ? <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      : reports.length === 0 ? <Empty>No reports match this filter.</Empty>
      : <>
          <ul className="m-0 grid list-none gap-3 p-0">{paginatedReports.map((r) => <ReportRow key={r.id} report={r} onInspect={inspect} onDecide={decide} />)}</ul>
          <Pagination currentPage={page} totalPages={totalPages} totalItems={reports.length} pageSize={pageSize} onPageChange={setPage} />
        </>}
    <Modal open={!!evidence} onClose={() => setEvidence(null)} title="Report evidence" description="Bounded snapshot captured when the report was filed." className="max-h-[calc(100dvh-2rem)] lg:max-h-[85dvh] overflow-y-auto">
      {evidence && <EvidenceView report={evidence} />}
    </Modal>
    <Modal open={!!dialog} onClose={close} title={resolving ? "Resolve report" : "Dismiss report"} description="Your decision and note are recorded in the audit log." className="max-h-[calc(100dvh-2rem)] lg:max-h-[85dvh] overflow-y-auto">
      <div className="grid gap-4">
        <AdminReasonField id="admin-report-note" label="Resolution note" value={note} min={5} onChange={setNote} disabled={saving} />
        {resolving && <>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={suspend} onChange={(e) => setSuspend(e.target.checked)} disabled={saving} className="size-5" />Suspend reported account</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={unpublish} onChange={(e) => setUnpublish(e.target.checked)} disabled={saving} className="size-5" />Unpublish reported listing</label>
        </>}
        {dialogError && <Alert variant="error">{dialogError}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
          <Button variant={resolving && suspend ? "destructive" : "primary"} onClick={confirm} disabled={saving || reasonProblem(note, 5) !== null}>{saving ? "Saving…" : resolving ? "Resolve" : "Dismiss"}</Button>
        </div>
      </div>
    </Modal>
  </section>;
}
