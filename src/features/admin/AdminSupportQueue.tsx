"use client";

import { useEffect, useState } from "react";
import { Paperclip, Search, X } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { notify } from "@/components/ui/AppToaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  type SupportTicketPriority,
  type SupportTicketRecord,
  type SupportTicketStatus,
} from "@/lib/support/constants";
import { AdminReasonField } from "./AdminReasonField";
import { adminCall, formatAdminDate, newOperationId, reasonProblem } from "./admin-api";
import { statusBadgeVariant } from "./status-badge";

const statusTabs = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const categoryFilterOptions = [
  { value: "all", label: "All categories" },
  ...SUPPORT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

const statusSelectOptions = SUPPORT_STATUSES.map((s) => ({ value: s.value, label: s.label }));
const prioritySelectOptions = SUPPORT_PRIORITIES.map((p) => ({ value: p.value, label: p.label }));

type UpdateDialog = {
  ticket: SupportTicketRecord;
  operationId: string;
};

export function TicketRow({
  ticket,
  highlighted,
  onManage,
  onOpenAttachment,
}: {
  ticket: SupportTicketRecord;
  highlighted: boolean;
  onManage: (ticket: SupportTicketRecord) => void;
  onOpenAttachment: (ticketId: string, storagePath: string) => void;
}) {
  return (
    <li
      id={`ticket-${ticket.id}`}
      className={`grid gap-3 rounded-xl border bg-card p-4 transition ${
        highlighted ? "border-action ring-2 ring-action/20" : "border-border hover:border-action/30"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-foreground">{ticket.ticketNumber}</span>
          <Badge variant={statusBadgeVariant(ticket.status)}>{SUPPORT_STATUS_LABELS[ticket.status] ?? ticket.status}</Badge>
          <Badge variant={statusBadgeVariant(ticket.priority)}>{ticket.priority}</Badge>
          <Badge variant="outline">{SUPPORT_CATEGORY_LABELS[ticket.category] ?? ticket.category}</Badge>
        </div>
        <time dateTime={ticket.createdAt} className="text-xs text-muted-foreground">
          {formatAdminDate(ticket.createdAt)}
        </time>
      </div>

      <div>
        <h3 className="m-0 text-base font-semibold text-foreground">{ticket.subject}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          From <span className="font-medium text-foreground">{ticket.requesterName}</span> ({ticket.requesterEmail})
          {" · "}
          <span className="capitalize">{ticket.requesterRole}</span>
        </p>
      </div>

      <p className="m-0 whitespace-pre-wrap break-words text-sm text-foreground/90">{ticket.description}</p>

      {ticket.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ticket.attachments.map((att) => (
            <button
              key={att.storagePath}
              type="button"
              onClick={() => onOpenAttachment(ticket.id, att.storagePath)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Paperclip size={14} aria-hidden="true" />
              <span className="max-w-48 truncate">{att.fileName}</span>
            </button>
          ))}
        </div>
      )}

      {ticket.adminResponse && (
        <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-sm">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin response</p>
          <p className="m-0 mt-1 whitespace-pre-wrap break-words text-foreground">{ticket.adminResponse}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
        <span className="text-xs text-muted-foreground">
          {ticket.assignedAdminName ? `Last handled by ${ticket.assignedAdminName}` : "Unassigned"}
        </span>
        <Button size="sm" variant="primary" onClick={() => onManage(ticket)}>
          Update ticket
        </Button>
      </div>
    </li>
  );
}

export function AdminSupportQueue({
  userId,
  initialStatus,
  initialTicketId,
}: {
  userId: string;
  initialStatus?: string;
  initialTicketId?: string;
}) {
  const [status, setStatus] = useState(
    statusTabs.some((t) => t.value === initialStatus) ? initialStatus! : initialTicketId ? "all" : "open",
  );
  const [category, setCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [tickets, setTickets] = useState<SupportTicketRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [dialog, setDialog] = useState<UpdateDialog | null>(null);
  const [nextStatus, setNextStatus] = useState<SupportTicketStatus>("in_progress");
  const [nextPriority, setNextPriority] = useState<SupportTicketPriority>("normal");
  const [adminResponse, setAdminResponse] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const abort = new AbortController();
    (async () => {
      setTickets(null);
      setError(null);
      const params = new URLSearchParams({ status, category });
      if (searchQuery) params.set("search", searchQuery);
      const result = await adminCall<{ tickets?: SupportTicketRecord[] }>(
        `/api/admin/support?${params.toString()}`,
        userId,
        undefined,
        abort.signal,
      );
      if (abort.signal.aborted) return;
      if (result.ok) {
        setTickets(Array.isArray(result.data.tickets) ? result.data.tickets : []);
      } else {
        setError(result.message);
        notify("error", "admin-support-load", result.message);
      }
    })();
    return () => abort.abort();
  }, [status, category, searchQuery, userId, reloadKey]);

  function openManage(ticket: SupportTicketRecord) {
    setDialog({ ticket, operationId: newOperationId() });
    setNextStatus(ticket.status === "open" ? "in_progress" : ticket.status);
    setNextPriority(ticket.priority);
    setAdminResponse(ticket.adminResponse ?? "");
    setReason("");
    setDialogError(null);
  }

  function closeManage() {
    if (!saving) setDialog(null);
  }

  async function openAttachment(ticketId: string, storagePath: string) {
    const result = await adminCall<{ url?: string }>(
      `/api/support/tickets/${encodeURIComponent(ticketId)}/attachments?path=${encodeURIComponent(storagePath)}`,
      userId,
    );
    if (result.ok && result.data.url) {
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    } else {
      notify("error", "admin-support-attachment", result.ok ? "Attachment could not be opened." : result.message);
    }
  }

  async function confirmUpdate() {
    if (!dialog || saving || reasonProblem(reason, 5)) return;
    if (adminResponse.trim().length > 2000) {
      setDialogError("Response must be 2,000 characters or less.");
      return;
    }
    setSaving(true);
    setDialogError(null);
    const result = await adminCall<{ ticket?: { status?: SupportTicketStatus; priority?: SupportTicketPriority; adminResponse?: string | null } }>(
      `/api/admin/support/${dialog.ticket.id}`,
      userId,
      {
        operationId: dialog.operationId,
        status: nextStatus,
        priority: nextPriority,
        adminResponse: adminResponse.trim() || null,
        reason: reason.trim(),
      },
    );
    setSaving(false);
    if (!result.ok) {
      setDialogError(result.message);
      notify("error", "admin-support-update", result.message);
      return;
    }
    setDialog(null);
    notify("success", "admin-support-update", `Ticket ${dialog.ticket.ticketNumber} updated.`);
    setReloadKey((k) => k + 1);
  }

  const totalPages = tickets ? Math.max(1, Math.ceil(tickets.length / pageSize)) : 1;
  const validPage = Math.min(page, totalPages);
  const paginatedTickets = tickets ? tickets.slice((validPage - 1) * pageSize, validPage * pageSize) : [];

  return (
    <section aria-label="Support tickets" className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {statusTabs.map((t) => (
            <Button
              key={t.value}
              size="sm"
              variant={status === t.value ? "primary" : "outline"}
              aria-pressed={status === t.value}
              onClick={() => {
                setStatus(t.value);
                setPage(1);
              }}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:w-64">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search ticket, email, or subject"
              aria-label="Search support tickets"
              className="pl-9 pr-9"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchInput("");
                  setPage(1);
                }}
                className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="sm:w-52">
            <Select
              aria-label="Filter by category"
              options={categoryFilterOptions}
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {error ? (
        <Alert variant="error">
          {error}{" "}
          <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </Button>
        </Alert>
      ) : tickets === null ? (
        <div className="grid gap-3" role="status" aria-label="Loading support tickets">
          <span className="sr-only">Loading support tickets…</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Empty>No support tickets match these filters.</Empty>
      ) : (
        <>
          <ul className="m-0 grid list-none gap-3 p-0">
            {paginatedTickets.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                highlighted={initialTicketId === ticket.id}
                onManage={openManage}
                onOpenAttachment={(id, path) => void openAttachment(id, path)}
              />
            ))}
          </ul>
          <Pagination
            currentPage={validPage}
            totalPages={totalPages}
            totalItems={tickets.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={!!dialog}
        onClose={closeManage}
        title={dialog ? `Update ${dialog.ticket.ticketNumber}` : "Update ticket"}
        description="Status updates and replies notify the requester and are recorded in the admin audit log."
        className="max-h-[calc(100dvh-2rem)] lg:max-h-[85dvh] overflow-y-auto"
      >
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="admin-ticket-status" className="text-sm font-medium">
                Status
              </label>
              <Select
                id="admin-ticket-status"
                aria-label="Ticket status"
                options={statusSelectOptions}
                value={nextStatus}
                onValueChange={(value) => setNextStatus(value as SupportTicketStatus)}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="admin-ticket-priority" className="text-sm font-medium">
                Priority
              </label>
              <Select
                id="admin-ticket-priority"
                aria-label="Ticket priority"
                options={prioritySelectOptions}
                value={nextPriority}
                onValueChange={(value) => setNextPriority(value as SupportTicketPriority)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="admin-ticket-response" className="text-sm font-medium">
              Response to requester <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="admin-ticket-response"
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              disabled={saving}
              rows={4}
              maxLength={2000}
              placeholder="Write a helpful reply visible to the user on their support page…"
              className="min-h-24 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <AdminReasonField
            id="admin-ticket-reason"
            label="Audit note"
            value={reason}
            min={5}
            onChange={setReason}
            disabled={saving}
          />

          {dialogError && <Alert variant="error">{dialogError}</Alert>}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={closeManage} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmUpdate}
              disabled={saving || reasonProblem(reason, 5) !== null}
            >
              {saving ? "Saving…" : "Save update"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
