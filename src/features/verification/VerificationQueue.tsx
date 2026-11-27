"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileCheck,
  FileText,
  MapPin,
  Phone,
  Upload,
  User,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { notify } from "@/components/ui/AppToaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MediaPreviewModal } from "@/components/ui/MediaPreviewModal";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { newOperationId } from "@/features/admin/admin-api";

export type VerificationQueueItem = {
  id: string;
  title?: string | null;
  description?: string | null;
  propertyType?: string | null;
  streetAddress?: string | null;
  barangay?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landlordId?: string | null;
  landlordName?: string | null;
  landlordPhone?: string | null;
  submissionDraftId: string;
  submissionExpectedRevision: number;
  submissionOperationId: string;
  submissionCreatedAt: string;
  reviewStatus: string;
  fieldVerificationStatus: string;
  fieldVerifiedBy?: string | null;
  fieldVerifiedAt?: string | null;
  fieldVerificationMethod?: string | null;
  fieldVerificationNotes?: string | null;
  fieldVerificationProof?: Array<{ kind: string; object_path: string; signedUrl?: string | null }>;
  fieldVerificationProxyName?: string | null;
  fieldVerificationProxyRelationship?: string | null;
};

const filterTabs = [
  { value: "pending_verification", label: "Pending verification" },
  { value: "verified", label: "Verified" },
  { value: "flagged", label: "Flagged" },
  { value: "all", label: "All" },
];

export function VerificationQueue({
  userId,
  initialQueue,
  initialOffset = 0,
  initialStatus,
  initialPropertyId,
  initialSearch,
}: {
  userId: string;
  initialQueue?: VerificationQueueItem[];
  initialOffset?: number;
  initialStatus?: "pending_verification" | "verified" | "flagged" | "all";
  initialPropertyId?: string;
  initialSearch?: string;
}) {
  const [filter, setFilter] = useState<"pending_verification" | "verified" | "flagged" | "all">(
    initialStatus ?? "pending_verification"
  );
  const [search, setSearch] = useState(initialSearch ?? "");
  const [offset, setOffset] = useState(initialOffset);
  const pageSize = 50;
  const [queue, setQueue] = useState<VerificationQueueItem[] | null>(initialQueue ?? null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const skipInitialFetchRef = useRef(Boolean(initialQueue) && initialOffset === 0);
  const handledPropertyIdRef = useRef<string | null>(null);

  // Verification modal action state
  const [activeItem, setActiveItem] = useState<VerificationQueueItem | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; title: string } | null>(null);
  const closeActiveItem = () => {
    setActiveItem(null);
    setPreviewMedia(null);
  };
  const activeItemRef = useRef(activeItem);
  useEffect(() => {
    activeItemRef.current = activeItem;
  }, [activeItem]);

  // Fixed: Site visit is the only method for new submissions
  const [visitWith, setVisitWith] = useState<"owner" | "representative">("owner");
  const [proxyName, setProxyName] = useState("");
  const [proxyRelationship, setProxyRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [proofList, setProofList] = useState<Array<{ kind: string; object_path: string; signedUrl?: string | null }>>([]);
  const [uploading, setUploading] = useState(false);
  // Fixed: Neutral proof kind for new uploads
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Handle deep-linking: when initialPropertyId is provided, highlight and open modal once per propertyId
  useEffect(() => {
    if (!initialPropertyId || !queue || handledPropertyIdRef.current === initialPropertyId) return;
    const matchingItem = queue.find((item) => item.id === initialPropertyId);
    if (matchingItem) {
      handledPropertyIdRef.current = initialPropertyId;
      openActionModal(matchingItem);
      return;
    }

    const abort = new AbortController();
    fetch(`/api/verification/queue/${encodeURIComponent(initialPropertyId)}`, {
      headers: { "x-expected-user-id": userId },
      signal: abort.signal,
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        const item = (data?.property ?? data) as VerificationQueueItem | undefined;
        if (item?.id && handledPropertyIdRef.current !== initialPropertyId && !abort.signal.aborted) {
          handledPropertyIdRef.current = initialPropertyId;
          openActionModal(item);
        }
      })
      .catch(() => {
        // Ignore fetch errors for deep-link
      });
    return () => abort.abort();
  }, [initialPropertyId, queue, userId]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      setQueue(null);
      setError(null);
      const query = new URLSearchParams({
        status: filter,
        limit: String(pageSize),
        offset: String(offset),
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      try {
        const res = await fetch(`/api/verification/queue?${query}`, {
          headers: { "x-expected-user-id": userId },
          signal: abort.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load verification queue.");
        }
        const data = await res.json();
        setQueue(Array.isArray(data.queue) ? data.queue : []);
      } catch (err: unknown) {
        if (abort.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "Failed to load verification queue.";
        setError(msg);
        notify("error", "verification-queue-load", msg);
      }
    }, search ? 300 : 0);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [filter, search, offset, userId, reloadKey, initialQueue]);

  async function handleFileUpload(file: File) {
    if (!activeItem) return;
    const targetId = activeItem.id;
    setUploading(true);
    setActionError(null);
    try {
      const formData = new FormData();
      formData.append("operationId", newOperationId());
      // New contract: neutral "proof" kind
      formData.append("kind", "proof");
      formData.append("file", file);

      const res = await fetch(`/api/verification/queue/${targetId}/media`, {
        method: "POST",
        headers: { "x-expected-user-id": userId },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload verification file.");
      }

      const uploaded = await res.json();
      if (!activeItemRef.current || activeItemRef.current.id !== targetId) return;
      setProofList((prev) => [
        ...prev,
        {
          kind: uploaded.kind,
          object_path: uploaded.objectPath,
          signedUrl: uploaded.signedUrl,
        },
      ]);
      notify("success", "verification-upload", "Proof uploaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload proof.";
      setActionError(msg);
      notify("error", "verification-upload", msg);
    } finally {
      setUploading(false);
    }
  }

  async function submitVerification(status: "verified" | "flagged") {
    if (!activeItem || actionSaving || uploading) return;
    if (status === "verified" && proofList.length === 0) {
      setActionError("Verification requires at least one proof item (photo or document).");
      return;
    }
    if (notes.trim().length < 5) {
      setActionError("Please provide inspection notes (minimum 5 characters).");
      return;
    }
    if (visitWith === "representative" && (!proxyName.trim() || !proxyRelationship.trim())) {
      setActionError("Representative name and relationship are required.");
      return;
    }

    setActionSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/verification/queue/${activeItem.id}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-expected-user-id": userId,
        },
        body: JSON.stringify({
          contractVersion: 2,
          operationId: newOperationId(),
          submissionDraftId: activeItem.submissionDraftId,
          submissionExpectedRevision: activeItem.submissionExpectedRevision,
          status,
          method: "site_visit",
          notes: notes.trim(),
          proof: proofList,
          visitWith,
          representativeName: visitWith === "representative" ? proxyName.trim() : null,
          representativeRelationship: visitWith === "representative" ? proxyRelationship.trim() : null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit verification.");
      }

      notify(
        "success",
        "verification-submit",
        status === "verified"
          ? "Property marked as verified & notified admin."
          : "Property flagged with issues."
      );
      closeActiveItem();
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit verification.";
      setActionError(msg);
      notify("error", "verification-submit", msg);
    } finally {
      setActionSaving(false);
    }
  }

  function openActionModal(item: VerificationQueueItem) {
    setActiveItem(item);
    // For historical records, preserve the original method display
    // For new submissions, always use site_visit
    const isHistorical = item.fieldVerificationMethod === "video_call" || item.fieldVerificationMethod === "proxy_meeting";
    if (isHistorical) {
      // Pre-fill with historical data but new submissions will be site_visit
      setVisitWith(item.fieldVerificationProxyName ? "representative" : "owner");
      setProxyName(item.fieldVerificationProxyName || "");
      setProxyRelationship(item.fieldVerificationProxyRelationship || "");
    } else {
      setVisitWith("owner");
      setProxyName("");
      setProxyRelationship("");
    }
    setNotes(item.fieldVerificationNotes || "");
    setProofList(item.fieldVerificationProof || []);
    setActionError(null);
  }

  // Render method label for historical records
  function renderMethodLabel(method: string | null | undefined): string {
    switch (method) {
      case "site_visit":
        return "Site visit";
      case "video_call":
        return "Video call";
      case "proxy_meeting":
        return "Proxy meeting";
      default:
        return "—";
    }
  }

  return (
    <section aria-label="Verification queue" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Queue filter">
          {filterTabs.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={filter === tab.value ? "primary" : "outline"}
              aria-pressed={filter === tab.value}
              onClick={() => {
                setFilter(tab.value as "pending_verification" | "verified" | "flagged" | "all");
                setOffset(0);
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="w-full sm:w-72">
          <Input
            type="search"
            aria-label="Search verification queue"
            placeholder="Search title, address, or landlord…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
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
      ) : queue === null ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <Empty>No submissions currently match this filter.</Empty>
      ) : (
        <div className="grid gap-3">
          {queue.map((item) => (
            <article
              key={item.id}
              className={`grid gap-3 rounded-xl border bg-card p-4 transition hover:border-action/30 ${
                initialPropertyId === item.id ? "border-action ring-2 ring-action/25" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 break-words text-base font-semibold">
                      {item.title || "Untitled Property"}
                    </h3>
                    <Badge
                      variant={
                        item.fieldVerificationStatus === "verified"
                          ? "default"
                          : item.fieldVerificationStatus === "flagged"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      {item.fieldVerificationStatus === "verified"
                        ? "Verified"
                        : item.fieldVerificationStatus === "flagged"
                        ? "Flagged"
                        : "Pending verification"}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User size={14} aria-hidden="true" />
                      Landlord: {item.landlordName || "Unnamed"}
                    </span>
                    {item.landlordPhone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone size={14} aria-hidden="true" />
                        {item.landlordPhone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin size={14} aria-hidden="true" />
                      {[item.streetAddress, item.barangay, item.city].filter(Boolean).join(", ")}
                    </span>
                    {typeof item.latitude === "number" && typeof item.longitude === "number" && (
                      <span className="font-mono">
                        ({item.latitude.toFixed(4)}, {item.longitude.toFixed(4)})
                      </span>
                    )}
                    {/* Display historical verification method */}
                    {item.fieldVerificationMethod && (
                      <span className="flex items-center gap-1">
                        <FileCheck size={14} aria-hidden="true" />
                        Method: {renderMethodLabel(item.fieldVerificationMethod)}
                      </span>
                    )}
                    {item.fieldVerificationProxyName && (
                      <span className="flex items-center gap-1">
                        <User size={14} aria-hidden="true" />
                        Representative: {item.fieldVerificationProxyName} ({item.fieldVerificationProxyRelationship})
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => openActionModal(item)}
                  className="shrink-0 gap-1.5"
                >
                  <FileCheck size={16} aria-hidden="true" />
                  Verify submission
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {queue && (queue.length > 0 || offset > 0) && (
        <div className="flex items-center justify-between pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {queue.length > 0 ? `Showing ${offset + 1}–${offset + queue.length}` : `Page ${Math.floor(offset / pageSize) + 1} (empty)`}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={queue.length < pageSize}
            onClick={() => setOffset((o) => o + pageSize)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Verification submission modal */}
      <Modal
        open={Boolean(activeItem)}
        onClose={() => {
          if (!actionSaving) closeActiveItem();
        }}
        title="Field Verification Inspection"
        description={activeItem?.title || "Verify Property"}
        className="max-h-[calc(100dvh-2rem)] lg:max-h-[85dvh] max-w-xl overflow-y-auto"
      >
        {activeItem && (
          <div className="grid gap-4 text-sm">
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <p className="m-0 font-semibold">{activeItem.title}</p>
              <p className="m-0 text-xs text-muted-foreground">
                {[activeItem.streetAddress, activeItem.barangay, activeItem.city].filter(Boolean).join(", ")}
              </p>
              <p className="m-0 text-xs text-muted-foreground">
                Landlord: {activeItem.landlordName} ({activeItem.landlordPhone || "No phone"})
              </p>
            </div>

            {/* Fixed: Site visit label instead of method select */}
            <div className="grid gap-1.5">
              <label htmlFor="verify-method" className="text-xs font-medium text-foreground">
                Verification method
              </label>
              <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <FileCheck size={16} aria-hidden="true" className="text-action" />
                <span className="font-medium">Site visit</span>
              </div>
            </div>

            {/* Visit with: Owner or Representative */}
            <div className="grid gap-1.5">
              <label htmlFor="visit-with" className="text-xs font-medium text-foreground">
                Verified with
              </label>
              <Select
                id="visit-with"
                aria-label="Verified with"
                options={[
                  { value: "owner", label: "Owner" },
                  { value: "representative", label: "Representative" },
                ]}
                value={visitWith}
                onValueChange={(val) => setVisitWith(val as "owner" | "representative")}
              />
            </div>

            {visitWith === "representative" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label htmlFor="proxy-name" className="text-xs font-medium text-foreground">
                    Representative name
                  </label>
                  <Input
                    id="proxy-name"
                    placeholder="Full name of representative"
                    value={proxyName}
                    onChange={(e) => setProxyName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="proxy-rel" className="text-xs font-medium text-foreground">
                    Relationship
                  </label>
                  <Input
                    id="proxy-rel"
                    placeholder="e.g. Caretaker, Relative"
                    value={proxyRelationship}
                    onChange={(e) => setProxyRelationship(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="grid gap-1.5">
              <label htmlFor="verify-notes" className="text-xs font-medium text-foreground">
                Inspection notes (min 5 chars)
              </label>
              <textarea
                id="verify-notes"
                aria-label="Inspection notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe observations, building conditions, met landlord or caretaker..."
                className="w-full rounded-md border border-input bg-card p-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
            </div>

            {/* Proof Uploads - Neutral kind */}
            <div className="grid gap-2 border-t border-border/60 pt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Proof documents & photos
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {/* Removed kind select - now fixed to "proof" */}
                <span className="text-xs text-muted-foreground">Kind: Proof</span>
                <label className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted cursor-pointer">
                  <Upload size={14} aria-hidden="true" />
                  {uploading ? "Uploading…" : "Upload proof file"}
                  <input
                    type="file"
                    className="sr-only"
                    disabled={uploading}
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </label>
              </div>

              {proofList.length > 0 ? (
                <ul className="m-0 mt-2 flex flex-wrap gap-2 p-0 list-none">
                  {proofList.map((proof, i) => (
                    <li key={proof.object_path || i} className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
                      <FileText size={14} aria-hidden="true" />
                      <span>Proof {i + 1} ({proof.kind})</span>
                      {proof.signedUrl && (
                        <button
                          type="button"
                          data-media-url={proof.signedUrl}
                          onClick={() => setPreviewMedia({ url: proof.signedUrl!, title: `Proof ${i + 1} (${proof.kind})` })}
                          className="ml-1 cursor-pointer text-action underline"
                        >
                          View
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-xs text-muted-foreground">No proof uploaded yet. Verified status requires at least one proof file.</p>
              )}
            </div>

            {actionError && <Alert variant="error">{actionError}</Alert>}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={closeActiveItem}
                disabled={actionSaving}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => submitVerification("flagged")}
                disabled={actionSaving || uploading || notes.trim().length < 5}
              >
                Flag Issue
              </Button>
              <Button
                variant="primary"
                onClick={() => submitVerification("verified")}
                disabled={actionSaving || uploading || notes.trim().length < 5 || proofList.length === 0}
              >
                Mark Verified & Notify Admin
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <MediaPreviewModal
        open={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        url={previewMedia?.url ?? null}
        title={previewMedia?.title ?? "Proof preview"}
      />
    </section>
  );
}