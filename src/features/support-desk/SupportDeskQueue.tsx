"use client";

import { useEffect, useState } from "react";
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
import { statusBadgeVariant } from "@/features/admin/status-badge";

export type SupportDeskTicket = {
  id: string;
  userId?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterRole?: string | null;
  category: string;
  subject: string;
  description: string;
  relatedListingId?: string | null;
  attachments?: unknown[] | null;
  status: string;
  priority: string;
  reportedLandlordId?: string | null;
  reportedLandlordName?: string | null;
  landlordInquiryNote?: string | null;
  landlordInquirySentAt?: string | null;
  landlordResponse?: string | null;
  landlordRespondedAt?: string | null;
  handledBySupportId?: string | null;
  handledBySupportName?: string | null;
  supportResolutionNote?: string | null;
  escalatedToAdminAt?: string | null;
  escalationReason?: string | null;
  recommendedAdminAction?: string | null;
  adminResponse?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type SupportActionType = "request_landlord_response" | "resolve" | "escalate_to_admin";

export type SupportActionPayload = {
  operationId: string;
  action: SupportActionType;
  note: string;
  reportedLandlordId?: string | null;
  recommendedAdminAction?: string | null;
};

const tabs = [
  { value: "open", label: "Open" },
  { value: "awaiting_landlord", label: "Awaiting Landlord" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

const label = (value: string) => value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export async function submitSupportAction(
  userId: string,
  ticketId: string,
  payload: SupportActionPayload,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/support-desk/tickets/${ticketId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-expected-user-id": userId,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: json.error || "Action could not be completed." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error. Please try again." };
  }
}

export function SupportTicketRow({
  ticket,
  onAct,
}: {
  ticket: SupportDeskTicket;
  onAct: (ticket: SupportDeskTicket, action: SupportActionType) => void;
}) {
  const isAwaiting = ticket.status === "awaiting_landlord";
  const isClosed = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <li className="grid gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-action/30">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusBadgeVariant(ticket.status)}>{label(ticket.status)}</Badge>
        <Badge variant="outline">{label(ticket.category)}</Badge>
        <Badge variant={ticket.priority === "urgent" || ticket.priority === "high" ? "destructive" : "outline"}>
          {label(ticket.priority)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(ticket.createdAt).toLocaleDateString()}
        </span>
      </div>

      <h3 className="m-0 text-base font-semibold">{ticket.subject}</h3>

      <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
        <p className="m-0">
          Requester:{" "}
          <span className="font-medium text-foreground">
            {ticket.requesterName || "Anonymous"} ({ticket.requesterEmail || "No email"})
          </span>
        </p>
        <p className="m-0">
          Reported Landlord:{" "}
          <span className="font-medium text-foreground">
            {ticket.reportedLandlordName || ticket.reportedLandlordId || "None"}
          </span>
        </p>
      </div>

      <p className="m-0 whitespace-pre-wrap break-words text-sm">{ticket.description}</p>

      {ticket.landlordInquiryNote && (
        <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs">
          <span className="font-semibold text-foreground">Inquiry sent to landlord:</span>{" "}
          {ticket.landlordInquiryNote}
        </div>
      )}

      {ticket.landlordResponse && (
        <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs">
          <span className="font-semibold text-foreground">Landlord response:</span>{" "}
          {ticket.landlordResponse}
        </div>
      )}

      {ticket.supportResolutionNote && (
        <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs">
          <span className="font-semibold text-foreground">Resolution note:</span>{" "}
          {ticket.supportResolutionNote}
        </div>
      )}

      {ticket.escalationReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <span className="font-semibold">Escalated to Admin:</span> {ticket.escalationReason}
          {ticket.recommendedAdminAction && ` (Recommended action: ${label(ticket.recommendedAdminAction)})`}
        </div>
      )}

      {!isClosed && (
        <div className="flex flex-wrap gap-2 pt-1">
          {!isAwaiting && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAct(ticket, "request_landlord_response")}
            >
              Request Landlord Response
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={() => onAct(ticket, "resolve")}>
            Mark Settled & Resolved
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAct(ticket, "escalate_to_admin")}>
            Escalate to Admin
          </Button>
        </div>
      )}
    </li>
  );
}

export function SupportDeskQueue({
  userId,
  initialStatus,
}: {
  userId: string;
  initialStatus?: string;
}) {
  const [status, setStatus] = useState(
    tabs.some((t) => t.value === initialStatus) ? initialStatus! : "open",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [tickets, setTickets] = useState<SupportDeskTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Dialog State
  const [dialogTicket, setDialogTicket] = useState<SupportDeskTicket | null>(null);
  const [dialogAction, setDialogAction] = useState<SupportActionType | null>(null);
  const [note, setNote] = useState("");
  const [reportedLandlordId, setReportedLandlordId] = useState("");
  const [recommendedAdminAction, setRecommendedAdminAction] = useState<string>("review");
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    (async () => {
      setTickets(null);
      setError(null);
      try {
        const query = new URLSearchParams({
          status,
          ...(search.trim() ? { search: search.trim() } : {}),
        });
        const res = await fetch(`/api/support-desk/tickets?${query.toString()}`, {
          headers: { "x-expected-user-id": userId },
          signal: abort.signal,
        });
        if (abort.signal.aborted) return;
        const json = await res.json();
        if (res.ok) {
          setTickets(Array.isArray(json.tickets) ? json.tickets : []);
        } else {
          setError(json.error || "Failed to load tickets.");
          notify("error", "support-queue-load", json.error || "Failed to load tickets.");
        }
      } catch {
        if (!abort.signal.aborted) {
          setError("Network error while loading tickets.");
        }
      }
    })();
    return () => abort.abort();
  }, [status, search, userId, reloadKey]);

  const openAction = (ticket: SupportDeskTicket, action: SupportActionType) => {
    setDialogTicket(ticket);
    setDialogAction(action);
    setNote("");
    setReportedLandlordId(ticket.reportedLandlordId || "");
    setRecommendedAdminAction("review");
    setDialogError(null);
  };

  const closeDialog = () => {
    if (!saving) {
      setDialogTicket(null);
      setDialogAction(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!dialogTicket || !dialogAction || saving || note.trim().length < 5) return;
    setSaving(true);
    setDialogError(null);

    const operationId = crypto.randomUUID();
    const payload: SupportActionPayload = {
      operationId,
      action: dialogAction,
      note: note.trim(),
      reportedLandlordId: dialogAction === "request_landlord_response" ? reportedLandlordId.trim() || null : null,
      recommendedAdminAction: dialogAction === "escalate_to_admin" ? recommendedAdminAction : null,
    };

    const res = await submitSupportAction(userId, dialogTicket.id, payload);
    setSaving(false);
    if (!res.ok) {
      setDialogError(res.message || "Failed to perform action.");
      notify("error", "support-action-fail", res.message || "Failed to perform action.");
      return;
    }

    notify("success", "support-action-success", "Ticket updated successfully.");
    closeDialog();
    setReloadKey((k) => k + 1);
  };

  const totalPages = tickets ? Math.max(1, Math.ceil(tickets.length / pageSize)) : 1;
  const validPage = Math.min(page, totalPages);
  const paginatedTickets = tickets ? tickets.slice((validPage - 1) * pageSize, validPage * pageSize) : [];

  return (
    <section aria-label="Support desk queue" className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {tabs.map((t) => (
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
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search complaints…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
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
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Empty>No complaints match this filter.</Empty>
      ) : (
        <>
          <ul className="m-0 grid list-none gap-3 p-0">
            {paginatedTickets.map((t) => (
              <SupportTicketRow key={t.id} ticket={t} onAct={openAction} />
            ))}
          </ul>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={tickets.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={!!dialogTicket && !!dialogAction}
        onClose={closeDialog}
        title={
          dialogAction === "request_landlord_response"
            ? "Request Landlord Response"
            : dialogAction === "resolve"
              ? "Mark Settled & Resolved"
              : "Escalate to Admin"
        }
        description="Provide complete details below. Actions are recorded in the audit history."
      >
        <div className="grid gap-4">
          {dialogAction === "request_landlord_response" && !dialogTicket?.reportedLandlordId && (
            <div className="grid gap-1">
              <label htmlFor="landlord-id-input" className="text-sm font-medium">
                Reported Landlord User ID
              </label>
              <Input
                id="landlord-id-input"
                placeholder="UUID of landlord profile"
                value={reportedLandlordId}
                onChange={(e) => setReportedLandlordId(e.target.value)}
                disabled={saving}
              />
            </div>
          )}

          {dialogAction === "escalate_to_admin" && (
            <div className="grid gap-1">
              <label htmlFor="recommended-action-select" className="text-sm font-medium">
                Recommended Admin Action
              </label>
              <Select
                id="recommended-action-select"
                value={recommendedAdminAction}
                onValueChange={setRecommendedAdminAction}
                disabled={saving}
              >
                <option value="review">Review Only</option>
                <option value="suspend_account">Suspend Account</option>
                <option value="unpublish_listing">Unpublish Listing</option>
                <option value="both">Both (Suspend &amp; Unpublish)</option>
              </Select>
            </div>
          )}

          <div className="grid gap-1">
            <label htmlFor="support-action-note" className="text-sm font-medium">
              {dialogAction === "request_landlord_response"
                ? "Inquiry Note to Landlord"
                : dialogAction === "resolve"
                  ? "Settlement & Resolution Note"
                  : "Escalation Reason"}
            </label>
            <textarea
              id="support-action-note"
              rows={4}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter at least 5 characters..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={saving}
            />
          </div>

          {dialogError && <Alert variant="error">{dialogError}</Alert>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant={dialogAction === "escalate_to_admin" ? "destructive" : "primary"}
              onClick={handleConfirmAction}
              disabled={saving || note.trim().length < 5}
            >
              {saving ? "Saving…" : "Submit"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
