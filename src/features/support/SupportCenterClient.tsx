"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Headset,
  HelpCircle,
  Paperclip,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { Alert } from "@/components/ui/Alert";
import { notify } from "@/components/ui/AppToaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { Field, FieldError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/components/ui/cn";
import { statusBadgeVariant } from "@/features/admin/status-badge";
import { LandlordMobileNav } from "@/features/landlord/LandlordMobileNav";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  type SupportCategory,
  type SupportTicketRecord,
} from "@/lib/support/constants";
import {
  validateSupportAttachmentFiles,
  validateSupportSubmission,
  type SupportFieldErrors,
} from "@/lib/support/validation";

export interface SupportCenterClientProps {
  authenticated: boolean;
  userId?: string | null;
  initialName?: string;
  initialEmail?: string;
  userRole?: string | null;
  backHref: string;
  backLabel: string;
  turnstileRequired?: boolean;
  highlightTicketId?: string | null;
  guestToken?: string | null;
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTicketDate(iso: string): string {
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

export function SupportCenterClient({
  authenticated,
  userId = null,
  initialName = "",
  initialEmail = "",
  userRole = null,
  backHref,
  backLabel,
  turnstileRequired = false,
  highlightTicketId = null,
  guestToken = null,
}: SupportCenterClientProps) {
  // Form State
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [category, setCategory] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [listingId, setListingId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [website, setWebsite] = useState(""); // Honeypot
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  // Status & Validation
  const [errors, setErrors] = useState<SupportFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketNumber: string;
    id: string;
    guestStatusUrl?: string | null;
  } | null>(null);
  const [operationId, setOperationId] = useState(() => generateUuid());

  // Guest status lookup state (via ?ticket=<id>&token=<token>)
  const [guestLookupTicket, setGuestLookupTicket] = useState<SupportTicketRecord | null>(null);
  const [guestLookupLoading, setGuestLookupLoading] = useState(
    Boolean(!authenticated && highlightTicketId && guestToken),
  );
  const [guestLookupError, setGuestLookupError] = useState<string | null>(null);

  // Request History State (Authenticated users)
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [awaitingLandlordComplaints, setAwaitingLandlordComplaints] = useState<SupportTicketRecord[]>([]);
  const [landlordResponseText, setLandlordResponseText] = useState<Record<string, string>>({});
  const [landlordSubmittingId, setLandlordSubmittingId] = useState<string | null>(null);
  const [landlordResponseError, setLandlordResponseError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(authenticated);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expandedTicketIds, setExpandedTicketIds] = useState<Set<string>>(() => new Set());
  const [localHighlightId, setLocalHighlightId] = useState<string | null>(highlightTicketId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyAbortRef = useRef<AbortController | null>(null);

  const fetchTickets = useCallback(
    async (signal?: AbortSignal) => {
      if (!authenticated || !userId) return;
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const response = await fetch("/api/support/tickets", {
          signal,
          headers: {
            "x-expected-user-id": userId,
          },
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Failed to load support requests. Please try again.";
          throw new Error(message);
        }

        if (signal?.aborted) return;
        const ticketList: SupportTicketRecord[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.tickets)
            ? payload.tickets
            : [];
        setTickets(ticketList);
        setAwaitingLandlordComplaints(Array.isArray(payload?.awaitingLandlordComplaints) ? payload.awaitingLandlordComplaints : []);
      } catch (err) {
        if (signal?.aborted) return;
        setHistoryError(
          err instanceof Error ? err.message : "Failed to load support requests."
        );
      } finally {
        if (!signal?.aborted) {
          setHistoryLoading(false);
        }
      }
    },
    [authenticated, userId]
  );

  const handleLandlordResponse = async (ticketId: string) => {
    if (!userId || landlordSubmittingId) return;
    const responseText = (landlordResponseText[ticketId] ?? "").trim();
    if (responseText.length < 5) {
      setLandlordResponseError("Please provide a response of at least 5 characters.");
      return;
    }
    setLandlordSubmittingId(ticketId);
    setLandlordResponseError(null);
    try {
      const response = await fetch(`/api/support/tickets/${encodeURIComponent(ticketId)}/respond`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-expected-user-id": userId },
        body: JSON.stringify({ operationId: generateUuid(), response: responseText }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Could not submit your response.");
      }
      notify("success", "support-landlord-response", "Your response has been sent to Customer Support.");
      setLandlordResponseText((previous) => ({ ...previous, [ticketId]: "" }));
      await fetchTickets();
    } catch (err) {
      setLandlordResponseError(err instanceof Error ? err.message : "Could not submit your response.");
    } finally {
      setLandlordSubmittingId(null);
    }
  };

  useEffect(() => {
    if (!authenticated || !userId) return;
    const controller = new AbortController();
    historyAbortRef.current = controller;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch triggers async state update with abort handling
    void fetchTickets(controller.signal);

    return () => {
      controller.abort();
    };
  }, [authenticated, userId, fetchTickets]);

  useEffect(() => {
    if (authenticated || !highlightTicketId || !guestToken) return;
    const controller = new AbortController();
    (async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setGuestLookupLoading(true);
      setGuestLookupError(null);
      try {
        const res = await fetch(
          `/api/support/tickets/${encodeURIComponent(highlightTicketId)}?token=${encodeURIComponent(guestToken)}`,
          { signal: controller.signal },
        );
        const payload = await res.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (!res.ok || !payload?.ticket) {
          setGuestLookupError(payload?.error ?? "Could not load ticket status.");
          setGuestLookupTicket(null);
        } else {
          setGuestLookupTicket(payload.ticket as SupportTicketRecord);
        }
      } catch {
        if (!controller.signal.aborted) {
          setGuestLookupError("Could not load ticket status.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setGuestLookupLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, [authenticated, highlightTicketId, guestToken]);

  useEffect(() => {
    if (highlightTicketId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync external highlightTicketId prop change
      setLocalHighlightId(highlightTicketId);
      setExpandedTicketIds((prev) => new Set([...prev, highlightTicketId]));
    }
  }, [highlightTicketId]);

  function focusFirstError(fieldErrors: SupportFieldErrors) {
    const order: (keyof SupportFieldErrors)[] = [
      "requesterName",
      "requesterEmail",
      "category",
      "subject",
      "relatedListingId",
      "description",
      "attachments",
    ];
    const fieldIdMap: Record<keyof SupportFieldErrors, string> = {
      requesterName: "support-name",
      requesterEmail: "support-email",
      category: "support-category",
      subject: "support-subject",
      relatedListingId: "support-listing-id",
      description: "support-description",
      attachments: "support-add-attachment-btn",
    };
    for (const key of order) {
      if (fieldErrors[key]) {
        const el = document.getElementById(fieldIdMap[key]);
        if (el) {
          el.focus();
          return;
        }
      }
    }
  }

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files ?? []);
    if (selected.length === 0) return;

    if (files.length + selected.length > 3) {
      const overflowMsg = `You can attach up to 3 files total. ${selected[0].name} and any extra selections were not added.`;
      setErrors((prev) => ({ ...prev, attachments: overflowMsg }));
      notify("warning", "support-attachment-warning", overflowMsg);
      event.currentTarget.value = "";
      return;
    }

    const merged = [...files, ...selected];
    const attachmentError = validateSupportAttachmentFiles(merged);
    if (attachmentError) {
      setErrors((prev) => ({ ...prev, attachments: attachmentError }));
      notify("warning", "support-attachment-warning", attachmentError);
      event.currentTarget.value = "";
      return;
    }

    setErrors((prev) => ({ ...prev, attachments: undefined }));
    setFiles(merged);
    event.currentTarget.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => ({ ...prev, attachments: undefined }));
  }

  function toggleTicketExpanded(id: string) {
    setExpandedTicketIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDownloadAttachment(ticketId: string, storagePath: string) {
    try {
      const query = new URLSearchParams({ path: storagePath });
      if (!authenticated && guestToken) {
        query.set("token", guestToken);
      }
      const response = await fetch(
        `/api/support/tickets/${encodeURIComponent(ticketId)}/attachments?${query.toString()}`,
        {
          headers: userId ? { "x-expected-user-id": userId } : undefined,
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url) {
        notify("error", "support-download-error", data?.error ?? "Attachment could not be opened.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      notify("error", "support-download-error", "Attachment could not be opened.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    // Honeypot check: silently accept to thwart spam bots
    if (website.trim().length > 0) {
      setSubmitting(true);
      await new Promise((r) => setTimeout(r, 600));
      setSubmitting(false);
      setSubmittedTicket({
        ticketNumber: "SUP-01001",
        id: generateUuid(),
      });
      notify("success", "support-ticket-submitted", "Support request submitted successfully.");
      return;
    }

    // Attachment validation
    const attachmentError = validateSupportAttachmentFiles(files);
    if (attachmentError) {
      setErrors({ attachments: attachmentError });
      setFormError(attachmentError);
      return;
    }

    const opId = operationId || generateUuid();
    const validation = validateSupportSubmission({
      operationId: opId,
      requesterName: name,
      requesterEmail: email,
      category,
      subject,
      description,
      relatedListingId: listingId.trim() || undefined,
      turnstileToken: turnstileToken || "dev-bypass",
      website,
    });

    if (!validation.ok) {
      setErrors(validation.errors);
      setFormError(validation.message);
      focusFirstError(validation.errors);
      return;
    }

    // Turnstile check after field validation so users see all field errors first
    if (turnstileRequired && !turnstileToken) {
      const message = "Complete the security verification before submitting.";
      setFormError(message);
      notify("warning", "turnstile-required", message);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setErrors({});

    try {
      const formData = new FormData();
      formData.set("operationId", validation.value.operationId);
      formData.set("requesterName", validation.value.requesterName);
      formData.set("requesterEmail", validation.value.requesterEmail);
      formData.set("category", validation.value.category);
      formData.set("subject", validation.value.subject);
      formData.set("description", validation.value.description);
      if (validation.value.relatedListingId) {
        formData.set("relatedListingId", validation.value.relatedListingId);
      }
      formData.set("turnstileToken", validation.value.turnstileToken);
      formData.set("website", website);

      for (const file of files) {
        formData.append("attachments", file);
      }

      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: userId ? { "x-expected-user-id": userId } : undefined,
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Failed to submit your support request. Please try again.";
        setFormError(errorMsg);
        notify("error", "support-ticket-error", errorMsg);
        setTurnstileResetKey((k) => k + 1);
        return;
      }

      const createdTicketNumber: string =
        payload?.ticketNumber ?? payload?.ticket?.ticketNumber ?? "SUP-RECEIVED";
      const createdId: string = payload?.id ?? payload?.ticket?.id ?? opId;
      const returnedToken =
        typeof payload?.guestToken === "string" && payload.guestToken ? payload.guestToken : null;
      const guestStatusUrl =
        !authenticated && returnedToken
          ? `/support?ticket=${encodeURIComponent(createdId)}&token=${encodeURIComponent(returnedToken)}`
          : null;
      const returnedAttachments = Array.isArray(payload?.ticket?.attachments)
        ? (payload.ticket.attachments as SupportTicketRecord["attachments"])
        : files.map((f) => ({
            fileName: f.name,
            fileSize: f.size,
            mimeType: f.type,
            storagePath: "",
          }));

      notify("success", "support-ticket-submitted", "Support request submitted successfully.");
      setSubmittedTicket({
        ticketNumber: createdTicketNumber,
        id: createdId,
        guestStatusUrl,
      });

      if (authenticated) {
        const newRecord: SupportTicketRecord = {
          id: createdId,
          ticketNumber: createdTicketNumber,
          userId: userId ?? null,
          requesterName: validation.value.requesterName,
          requesterEmail: validation.value.requesterEmail,
          requesterRole: userRole ?? "guest",
          category: validation.value.category as SupportCategory,
          subject: validation.value.subject,
          description: validation.value.description,
          relatedListingId: validation.value.relatedListingId,
          attachments: returnedAttachments,
          status: "open",
          priority: "normal",
          adminResponse: null,
          assignedAdminId: null,
          assignedAdminName: null,
          resolvedAt: null,
          createdAt: payload?.ticket?.createdAt ?? payload?.createdAt ?? new Date().toISOString(),
          updatedAt: payload?.ticket?.createdAt ?? payload?.createdAt ?? new Date().toISOString(),
        };

        setTickets((prev) => [newRecord, ...prev]);
        setLocalHighlightId(createdId);
        setExpandedTicketIds((prev) => new Set([...prev, createdId]));
      }

      // Reset fields for another request
      setSubject("");
      setDescription("");
      setListingId("");
      setFiles([]);
      setOperationId(generateUuid());
      setTurnstileResetKey((k) => k + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setFormError(msg);
      notify("error", "support-ticket-error", msg);
      setTurnstileResetKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetForAnother() {
    setSubmittedTicket(null);
    setFormError(null);
    setErrors({});
  }

  const isLandlordMobile = userRole === "landlord" && authenticated;

  return (
    <main className="relative isolate min-h-[100dvh] overflow-x-clip bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="sticky top-3 z-20 flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-white/90 p-3 shadow-sm backdrop-blur-sm dark:bg-slate-950/90 sm:px-5">
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>{backLabel}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/help"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <HelpCircle size={15} aria-hidden="true" />
              <span>Help Center</span>
            </Link>
            <BrandLogo className="h-auto w-28 sm:w-32" />
          </div>
        </header>

        <div
          className={cn(
            "relative z-10 mt-6 space-y-8 sm:mt-8",
            isLandlordMobile ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-16"
          )}
        >
          {/* Header Card */}
          <section className="rounded-2xl border border-border/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:bg-slate-950/90 sm:p-6">
            <p className="m-0 text-xs font-bold uppercase tracking-[.14em] text-action">
              Support &amp; Inquiries
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">
                  Contact support
                </h1>
                <p className="mb-0 mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Have a question, technical issue, or safety report? Submit your request below and our team will get back to you within one business day.
                </p>
              </div>
              <Link
                href="/help"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <HelpCircle size={18} aria-hidden="true" />
                <span>Browse FAQ</span>
              </Link>
            </div>
          </section>

          {/* Main Grid: Form + History/Info */}
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
            {/* Left Column: Contact Support Form */}
            <section
              className="rounded-2xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm sm:p-6"
              aria-labelledby="contact-form-heading"
            >
              <header className="mb-5 flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Headset size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 id="contact-form-heading" className="m-0 text-lg font-semibold">
                    Submit a support request
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Provide the details below so we can route your ticket to the right specialist.
                  </p>
                </div>
              </header>

              {/* Persistent Emerald Confirmation Alert */}
              {submittedTicket && (
                <Alert
                  variant="success"
                  className="mb-6 border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <p className="m-0 font-semibold text-base">
                        Support request received ({submittedTicket.ticketNumber})
                      </p>
                      <p className="m-0 text-sm opacity-90 leading-relaxed">
                        Your request has been logged and assigned to our support queue. We review inquiries in order of urgency and aim to respond within one business day.
                      </p>
                      {submittedTicket.guestStatusUrl && (
                        <div className="rounded-lg border border-emerald-500/30 bg-background/70 p-2.5 text-xs">
                          <p className="m-0 font-semibold">Save your private ticket status link</p>
                          <p className="m-0 mt-1 opacity-85">
                            Bookmark this link to check status updates and admin replies without signing in:
                          </p>
                          <Link
                            href={submittedTicket.guestStatusUrl}
                            className="mt-1.5 inline-block break-all font-mono font-semibold text-action underline"
                          >
                            {submittedTicket.guestStatusUrl}
                          </Link>
                        </div>
                      )}
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResetForAnother}
                          className="text-xs bg-card"
                        >
                          Submit another request
                        </Button>
                      </div>
                    </div>
                  </div>
                </Alert>
              )}

              {formError && (
                <Alert variant="error" className="mb-5">
                  <p className="m-0">{formError}</p>
                </Alert>
              )}

              <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
                {/* Honeypot field for anti-spam */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  aria-hidden="true"
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="sr-only"
                />

                {/* Requester Name & Email */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <label htmlFor="support-name" className="text-sm font-medium">
                      Full name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="support-name"
                      name="requesterName"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.requesterName) setErrors((prev) => ({ ...prev, requesterName: undefined }));
                      }}
                      placeholder="Your full name"
                      required
                      minLength={2}
                      maxLength={100}
                      disabled={submitting}
                      aria-invalid={Boolean(errors.requesterName)}
                      aria-describedby={errors.requesterName ? "support-name-error" : undefined}
                    />
                    {errors.requesterName && (
                      <FieldError id="support-name-error">{errors.requesterName}</FieldError>
                    )}
                  </Field>

                  <Field>
                    <label htmlFor="support-email" className="text-sm font-medium">
                      Email address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="support-email"
                      name="requesterEmail"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.requesterEmail) setErrors((prev) => ({ ...prev, requesterEmail: undefined }));
                      }}
                      placeholder="you@example.com"
                      required
                      maxLength={254}
                      disabled={submitting}
                      aria-invalid={Boolean(errors.requesterEmail)}
                      aria-describedby={errors.requesterEmail ? "support-email-error" : undefined}
                    />
                    {errors.requesterEmail && (
                      <FieldError id="support-email-error">{errors.requesterEmail}</FieldError>
                    )}
                  </Field>
                </div>

                {/* Category Selection */}
                <Field>
                  <label htmlFor="support-category" className="text-sm font-medium">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <Select
                    id="support-category"
                    name="category"
                    value={category}
                    onValueChange={(val) => {
                      setCategory(val);
                      if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
                    }}
                    options={SUPPORT_CATEGORIES.map((c) => ({
                      value: c.value,
                      label: c.label,
                    }))}
                    disabled={submitting}
                    aria-invalid={Boolean(errors.category)}
                    aria-describedby={errors.category ? "support-category-error" : undefined}
                  />
                  {errors.category && (
                    <FieldError id="support-category-error">{errors.category}</FieldError>
                  )}
                </Field>

                {/* Subject */}
                <Field>
                  <label htmlFor="support-subject" className="text-sm font-medium">
                    Subject <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="support-subject"
                    name="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
                    }}
                    placeholder="Brief summary of your issue"
                    required
                    minLength={5}
                    maxLength={140}
                    disabled={submitting}
                    aria-invalid={Boolean(errors.subject)}
                    aria-describedby={errors.subject ? "support-subject-error" : undefined}
                  />
                  {errors.subject && (
                    <FieldError id="support-subject-error">{errors.subject}</FieldError>
                  )}
                </Field>

                {/* Optional Related Listing ID */}
                <Field>
                  <label htmlFor="support-listing-id" className="text-sm font-medium">
                    Related Listing ID <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    id="support-listing-id"
                    name="relatedListingId"
                    type="text"
                    value={listingId}
                    onChange={(e) => {
                      setListingId(e.target.value);
                      if (errors.relatedListingId) setErrors((prev) => ({ ...prev, relatedListingId: undefined }));
                    }}
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000 (optional)"
                    disabled={submitting}
                    aria-invalid={Boolean(errors.relatedListingId)}
                    aria-describedby={errors.relatedListingId ? "support-listing-error" : undefined}
                  />
                  {errors.relatedListingId && (
                    <FieldError id="support-listing-error">{errors.relatedListingId}</FieldError>
                  )}
                </Field>

                {/* Description */}
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="support-description" className="text-sm font-medium">
                      Description <span className="text-destructive">*</span>
                    </label>
                    <span
                      className={cn(
                        "text-xs",
                        description.length > 0 && (description.length < 20 || description.length > 3000)
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {description.length} / 3,000 characters (min. 20)
                    </span>
                  </div>
                  <textarea
                    id="support-description"
                    name="description"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                    }}
                    placeholder="Describe what happened and how we can help..."
                    rows={5}
                    minLength={20}
                    maxLength={3000}
                    required
                    disabled={submitting}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={errors.description ? "support-description-error" : undefined}
                    className="min-h-32 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive text-sm"
                  />
                  {errors.description && (
                    <FieldError id="support-description-error">{errors.description}</FieldError>
                  )}
                </Field>

                {/* Attachments Section */}
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium">
                      Attachments <span className="text-xs font-normal text-muted-foreground">(optional, up to 3 files)</span>
                    </label>
                    <span className="text-xs text-muted-foreground">
                      JPG, PNG, WebP, PDF &le; 5 MB each
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    id="support-file-input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="sr-only"
                    onChange={handleFilesChange}
                    disabled={submitting || files.length >= 3}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      id="support-add-attachment-btn"
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting || files.length >= 3}
                      className="text-xs"
                    >
                      <Paperclip size={14} aria-hidden="true" />
                      <span>{files.length === 0 ? "Add attachment" : `Add more (${files.length}/3)`}</span>
                    </Button>
                  </div>

                  {/* Removable file chips */}
                  {files.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2" aria-label="Attached files">
                      {files.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs text-foreground"
                        >
                          <FileText size={13} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="max-w-40 truncate font-medium">{file.name}</span>
                          <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                          <button
                            type="button"
                            aria-label={`Remove ${file.name}`}
                            onClick={() => removeFile(idx)}
                            disabled={submitting}
                            className="ml-1 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
                          >
                            <X size={13} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.attachments && (
                    <FieldError id="support-attachments-error">{errors.attachments}</FieldError>
                  )}
                </Field>

                {/* Cloudflare Turnstile */}
                <div className="pt-2">
                  <TurnstileWidget
                    action="support"
                    onTokenChange={setTurnstileToken}
                    resetKey={turnstileResetKey}
                  />
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end pt-3">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="min-w-32"
                  >
                    <Send size={16} aria-hidden="true" />
                    <span>{submitting ? "Submitting…" : "Submit request"}</span>
                  </Button>
                </div>
              </form>
            </section>

            {/* Right Column: Request History (Authenticated) or Sign-in Guidance (Guest) */}
            <aside className="space-y-6">
              {authenticated && userRole === "landlord" && awaitingLandlordComplaints.length > 0 && (
                <section className="rounded-2xl border border-action/30 bg-action/5 p-5 text-card-foreground shadow-sm sm:p-6" aria-labelledby="landlord-complaints-heading">
                  <h2 id="landlord-complaints-heading" className="m-0 text-base font-semibold">Complaints Awaiting Your Response</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Customer Support requested your response to the following complaints.</p>
                  {landlordResponseError && <Alert variant="error" className="mt-3">{landlordResponseError}</Alert>}
                  <div className="mt-4 grid gap-4">
                    {awaitingLandlordComplaints.map((complaint) => (
                      <div key={complaint.id} className="rounded-xl border border-border bg-card p-4">
                        <h3 className="m-0 text-sm font-semibold">{complaint.subject}</h3>
                        {complaint.landlordInquiryNote && <p className="mt-2 text-sm"><strong>Support inquiry:</strong> {complaint.landlordInquiryNote}</p>}
                        <label htmlFor={`landlord-response-${complaint.id}`} className="mt-3 block text-sm font-medium">Your response</label>
                        <textarea
                          id={`landlord-response-${complaint.id}`}
                          rows={3}
                          maxLength={2000}
                          value={landlordResponseText[complaint.id] ?? ""}
                          onChange={(event) => setLandlordResponseText((previous) => ({ ...previous, [complaint.id]: event.target.value }))}
                          disabled={landlordSubmittingId !== null}
                          className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        />
                        <Button size="sm" onClick={() => void handleLandlordResponse(complaint.id)} disabled={landlordSubmittingId !== null || (landlordResponseText[complaint.id] ?? "").trim().length < 5}>
                          {landlordSubmittingId === complaint.id ? "Sending…" : "Submit response"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {authenticated ? (
              <section
              className="rounded-2xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm sm:p-6"
              aria-labelledby="ticket-history-heading"
              aria-label="Your support requests"
              >
                  <header className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-action" aria-hidden="true" />
                      <h2 id="ticket-history-heading" className="m-0 text-base font-semibold">
                        Your support requests
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => void fetchTickets()}
                      disabled={historyLoading}
                      aria-label="Refresh support requests"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={historyLoading ? "animate-spin" : ""} />
                    </button>
                  </header>

                  {historyError && (
                    <Alert variant="error" className="mb-4">
                      <p className="m-0 text-xs">{historyError}</p>
                      <button
                        type="button"
                        onClick={() => void fetchTickets()}
                        className="mt-2 text-xs font-semibold underline"
                      >
                        Try again
                      </button>
                    </Alert>
                  )}

                  {historyLoading && tickets.length === 0 ? (
                    <div className="space-y-3" role="status" aria-label="Loading support tickets">
                      <span className="sr-only">Loading your support tickets…</span>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl border border-border/70 bg-card p-3 space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : tickets.length === 0 ? (
                    <Empty className="p-6">
                      <Headset size={24} className="text-muted-foreground" aria-hidden="true" />
                      <p className="m-0 text-sm font-semibold">No support requests yet</p>
                      <p className="m-0 text-xs text-muted-foreground">
                        When you submit a request, you can monitor status updates and admin replies here.
                      </p>
                    </Empty>
                  ) : (
                    <ul className="list-none space-y-3 p-0 m-0">
                      {tickets.map((t) => {
                        const isExpanded = expandedTicketIds.has(t.id);
                        const isHighlighted = localHighlightId === t.id;

                        return (
                          <li
                            key={t.id}
                            className={cn(
                              "rounded-xl border bg-card p-3.5 transition-all text-xs",
                              isHighlighted
                                ? "border-action ring-2 ring-action/20"
                                : "border-border/80 hover:border-action/40"
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-mono font-bold text-foreground">
                                {t.ticketNumber}
                              </span>
                              <Badge variant={statusBadgeVariant(t.status)}>
                                {SUPPORT_STATUS_LABELS[t.status] ?? t.status}
                              </Badge>
                            </div>

                            <p className="mt-1 font-semibold text-sm text-foreground leading-snug">
                              {t.subject}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                              <span>{SUPPORT_CATEGORY_LABELS[t.category] ?? t.category}</span>
                              <span aria-hidden="true">·</span>
                              <time dateTime={t.createdAt}>{formatTicketDate(t.createdAt)}</time>
                            </div>

                            {/* Expandable toggle */}
                            <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
                              <button
                                type="button"
                                onClick={() => toggleTicketExpanded(t.id)}
                                aria-expanded={isExpanded}
                                className="inline-flex items-center gap-1 font-medium text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
                              >
                                <span>{isExpanded ? "Hide details" : "View details"}</span>
                                <ChevronDown
                                  size={13}
                                  className={cn("transition-transform duration-200", isExpanded && "rotate-180")}
                                  aria-hidden="true"
                                />
                              </button>
                            </div>

                            {/* Details Region */}
                            {isExpanded && (
                              <div className="mt-3 space-y-2.5 border-t border-border/60 pt-2.5">
                                <div>
                                  <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Your description
                                  </p>
                                  <p className="m-0 mt-1 whitespace-pre-wrap text-foreground/90 leading-relaxed">
                                    {t.description}
                                  </p>
                                </div>

                                {t.relatedListingId && (
                                  <div>
                                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      Related listing
                                    </p>
                                    <p className="m-0 mt-0.5 font-mono text-[11px] text-muted-foreground break-all">
                                      {t.relatedListingId}
                                    </p>
                                  </div>
                                )}

                                {t.attachments && t.attachments.length > 0 && (
                                  <div>
                                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      Attachments
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {t.attachments.map((att) => (
                                        <button
                                          key={att.storagePath || att.fileName}
                                          type="button"
                                          onClick={() =>
                                            handleDownloadAttachment(t.id, att.storagePath)
                                          }
                                          disabled={!att.storagePath}
                                          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer disabled:cursor-default disabled:opacity-75"
                                        >
                                          <Download size={11} aria-hidden="true" />
                                          <span className="max-w-32 truncate">{att.fileName}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Admin Response Banner */}
                                {t.adminResponse && (
                                  <div className="rounded-lg border border-border/80 bg-muted/50 p-2.5">
                                    <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-action">
                                      Admin response
                                    </p>
                                    <p className="m-0 mt-1 whitespace-pre-wrap text-foreground leading-relaxed">
                                      {t.adminResponse}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              ) : (
                <>
                  {(guestLookupLoading || guestLookupError || guestLookupTicket) && (
                    <section
                      className="rounded-2xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm sm:p-6"
                      aria-label="Guest ticket status"
                    >
                      <h2 className="m-0 text-base font-semibold">Ticket status</h2>
                      {guestLookupLoading ? (
                        <div className="mt-3 space-y-2" role="status">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ) : guestLookupError ? (
                        <Alert variant="error" className="mt-3">
                          <p className="m-0 text-xs">{guestLookupError}</p>
                        </Alert>
                      ) : guestLookupTicket ? (
                        <div className="mt-3 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-foreground">
                              {guestLookupTicket.ticketNumber}
                            </span>
                            <Badge variant={statusBadgeVariant(guestLookupTicket.status)}>
                              {SUPPORT_STATUS_LABELS[guestLookupTicket.status] ?? guestLookupTicket.status}
                            </Badge>
                          </div>
                          <p className="m-0 text-sm font-semibold text-foreground">{guestLookupTicket.subject}</p>
                          <p className="m-0 whitespace-pre-wrap text-foreground/90">{guestLookupTicket.description}</p>
                          {guestLookupTicket.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {guestLookupTicket.attachments.map((att) => (
                                <button
                                  key={att.storagePath || att.fileName}
                                  type="button"
                                  onClick={() => handleDownloadAttachment(guestLookupTicket.id, att.storagePath)}
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted cursor-pointer"
                                >
                                  <Download size={11} aria-hidden="true" />
                                  <span className="max-w-32 truncate">{att.fileName}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {guestLookupTicket.adminResponse ? (
                            <div className="rounded-lg border border-border/80 bg-muted/50 p-2.5">
                              <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-action">
                                Admin response
                              </p>
                              <p className="m-0 mt-1 whitespace-pre-wrap text-foreground">
                                {guestLookupTicket.adminResponse}
                              </p>
                            </div>
                          ) : (
                            <p className="m-0 text-muted-foreground">No admin reply yet. Check back using this private link.</p>
                          )}
                        </div>
                      ) : null}
                    </section>
                  )}

                  {/* Guest Sign-In Guidance Card */}
                  <section
                    className="rounded-2xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm sm:p-6"
                    aria-labelledby="guest-guidance-heading"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                        <Clock size={20} aria-hidden="true" />
                      </span>
                      <div>
                        <h2 id="guest-guidance-heading" className="m-0 text-base font-semibold">
                          Track your requests
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          Sign in before submitting a request to track tickets in your account and receive notifications. Signing in later does not recover earlier guest requests, so bookmark the private status link shown after submitting as a guest.
                        </p>
                        <div className="mt-4">
                          <Link
                            href="/login?next=%2Fsupport"
                            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            Sign in to track requests
                          </Link>
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* Self-Service Help Callout */}
              <section className="rounded-2xl border border-border/70 bg-card/60 p-5 text-card-foreground shadow-xs">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-action/10 text-action">
                    <HelpCircle size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="m-0 text-sm font-semibold text-foreground">
                      Need answers faster?
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Check our Help Center for instant answers about map search, rental shortlists, landlord permit verification, and payment safety.
                    </p>
                    <Link
                      href="/help"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-action hover:underline"
                    >
                      <span>Explore Help Center</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
      {isLandlordMobile && userId && <LandlordMobileNav userId={userId} />}
    </main>
  );
}
