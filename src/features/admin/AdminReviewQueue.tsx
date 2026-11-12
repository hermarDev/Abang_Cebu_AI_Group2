"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, CircleAlert, FileText } from "lucide-react";
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
import { AdminReasonField } from "./AdminReasonField";
import { adminCall, formatAdminDate, newOperationId, reasonProblem } from "./admin-api";

export type AdminProperty = {
  id: string;
  title?: string | null;
  description?: string | null;
  propertyType?: string | null;
  rentalType?: string | null;
  floorAreaSqm?: number | null;
  maxOccupants?: number | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  isAvailable?: boolean;
  monthlyRent?: number | null;
  streetAddress?: string | null;
  barangay?: string | null;
  city?: string | null;
  landlordName?: string | null;
  moderationNote?: string | null;
  submissionDraftId?: string | null;
  submissionExpectedRevision?: number | null;
  photoUrls?: string[];
  permitUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
  hasPendingRevision?: boolean;
  permitNotRequiredConfirmed?: boolean;
  permitExemptionReason?: string | null;
  documentCategories?: string | null;
  documentApplicabilityDecision?: string | null;
};

export type PendingRevision = {
  id: string;
  draftId: string;
  expectedRevision: number;
  snapshotPayload: Record<string, unknown>;
  snapshotMedia: Record<string, unknown>[];
  reviewStatus: string;
  createdAt: string;
};

export const reviewTabs = [
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved / Live" },
  { value: "rejected", label: "Changes requested" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

export type ReviewAction = "approve" | "reject" | "unpublish" | "restore";
type Dialog = { property: AdminProperty; action: ReviewAction; operationId: string };

export function statusLabel(property: Pick<AdminProperty, "status" | "isAvailable">) {
  switch (property.status) {
    case "pending": return "Pending review";
    case "approved": return property.isAvailable ? "Published · Available" : "Published · Unavailable";
    case "rejected": return "Changes requested";
    case "archived": return "Archived";
    default: return property.status;
  }
}

const actionCopy: Record<ReviewAction, { button: string; title: string; confirm: string; minReason: number; success: string }> = {
  approve: { button: "Approve", title: "Approve listing", confirm: "Approve", minReason: 0, success: "Listing approved." },
  reject: { button: "Request changes / Reject", title: "Request changes", confirm: "Send to landlord", minReason: 1, success: "Changes requested from the landlord." },
  unpublish: { button: "Unpublish", title: "Unpublish listing", confirm: "Unpublish", minReason: 5, success: "Listing unpublished." },
  restore: { button: "Restore", title: "Restore listing", confirm: "Restore", minReason: 5, success: "Listing restored." },
};

export function actionsFor(status: string): ReviewAction[] {
  return status === "pending" ? ["approve", "reject"] : status === "approved" ? ["unpublish"] : status === "archived" ? ["restore"] : [];
}

export async function submitReviewAction(userId: string, { property, action, operationId }: Dialog, reason: string, documentDecision?: string | null) {
  const note = reason.trim();
  const result = action === "approve" || action === "reject"
    ? await adminCall<{ status?: string }>("/api/admin/properties/review", userId, {
        propertyId: property.id, operationId, decision: action === "approve" ? "approved" : "rejected", note: action === "reject" ? note : null,
        submissionDraftId: property.submissionDraftId, submissionExpectedRevision: property.submissionExpectedRevision,
        ...(documentDecision ? { documentApplicabilityDecision: documentDecision } : {}),
      })
    : await adminCall<{ status?: string }>("/api/admin/properties/lifecycle", userId, { propertyId: property.id, operationId, action, reason: note });
  if (!result.ok) return result;
  const status = result.data.status ?? (action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "unpublish" ? "archived" : "approved");
  return { ok: true as const, property: { ...property, status, moderationNote: action === "approve" || action === "restore" ? null : note } };
}

const unitSpecs = (p: AdminProperty) => [
  p.propertyType && `Type: ${p.propertyType}`,
  p.rentalType && `Rental: ${p.rentalType}`,
  typeof p.floorAreaSqm === "number" && `Floor area: ${p.floorAreaSqm} sqm`,
  typeof p.maxOccupants === "number" && `Max occupants: ${p.maxOccupants}`,
].filter((v): v is string => Boolean(v));

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

export function reviewChecklist(p: AdminProperty): Array<{ label: string; ok: boolean; detail: string }> {
  const address = [p.streetAddress, p.barangay, p.city].filter(Boolean).join(", ");
  return [
    { label: "Address", ok: Boolean(p.streetAddress && p.city), detail: address || "Missing street address or city" },
    { label: "Location pin", ok: typeof p.latitude === "number" && typeof p.longitude === "number", detail: typeof p.latitude === "number" && typeof p.longitude === "number" ? `${p.latitude}, ${p.longitude}` : "No coordinates" },
    { label: "Monthly rent", ok: typeof p.monthlyRent === "number" && p.monthlyRent > 0, detail: typeof p.monthlyRent === "number" && p.monthlyRent > 0 ? peso.format(p.monthlyRent) : "Not set" },
    { label: "Photos", ok: Boolean(p.photoUrls?.length), detail: p.photoUrls?.length ? `${p.photoUrls.length} submitted` : "None submitted" },
    { label: "Permit documents", ok: Boolean(p.permitUrls?.length), detail: p.permitUrls?.length ? `${p.permitUrls.length} file(s) to inspect` : "None uploaded. This view does not show the landlord's residential exemption declaration." },
  ];
}

function ChecklistView({ property }: { property: AdminProperty }) {
  return <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 text-sm">
    <p className="m-0 mb-2 font-semibold">Submission checklist</p>
    <ul className="m-0 grid list-none gap-1.5 p-0 text-xs text-muted-foreground">
      {reviewChecklist(property).map((item) => <li key={item.label} className="flex items-start gap-2">
        {item.ok ? <CheckCircle2 size={14} className="mt-px shrink-0 text-emerald-500" aria-label="Present" /> : <CircleAlert size={14} className="mt-px shrink-0 text-amber-500" aria-label="Missing" />}
        <span><span className="font-medium text-foreground">{item.label}:</span> {item.detail}</span>
      </li>)}
    </ul>
  </div>;
}

export function PropertyDetails({
  property,
  revision
}: {
  property: AdminProperty;
  revision?: PendingRevision | null;
}) {
  const data = revision?.snapshotPayload.property as Record<string, unknown> | undefined;
  const unit = revision?.snapshotPayload.unit as Record<string, unknown> | undefined;
  if (revision) property = {
    id: property.id, status: property.status, landlordName: property.landlordName,
    title: data?.title as string, description: data?.description as string,
    propertyType: data?.property_type as string, rentalType: unit?.rental_type as string,
    monthlyRent: unit?.monthly_rent as number, floorAreaSqm: unit?.floor_area_sqm as number,
    maxOccupants: unit?.max_occupants as number,
    streetAddress: data?.street_address as string, barangay: data?.barangay as string, city: data?.city as string,
    postalCode: data?.postal_code as string, latitude: data?.latitude as number, longitude: data?.longitude as number,
    photoUrls: [], permitUrls: [],
  };
  const isRevision = !!revision;

  // Extract data from either property or revision (revision uses snake_case keys from DB)
  const title = (data?.title as string) ?? property.title;
  const description = (data?.description as string) ?? property.description;
  const propertyType = (data?.property_type as string) ?? property.propertyType;
  const rentalType = (data?.rental_type as string) ?? property.rentalType;
  const floorAreaSqm = (data?.floor_area_sqm as number) ?? property.floorAreaSqm;
  const maxOccupants = (data?.max_occupants as number) ?? property.maxOccupants;
  const monthlyRent = (data?.monthly_rent as number) ?? property.monthlyRent;
  const streetAddress = (data?.street_address as string) ?? property.streetAddress;
  const barangay = (data?.barangay as string) ?? property.barangay;
  const city = (data?.city as string) ?? property.city;
  const postalCode = (data?.postal_code as string) ?? property.postalCode;
  const latitude = (data?.latitude as number) ?? property.latitude;
  const longitude = (data?.longitude as number) ?? property.longitude;
  const permitApplicability = (data?.permit_applicability as string) ?? undefined;
  const permitNumber = (data?.permit_number as string) ?? undefined;
  const permitLgu = (data?.permit_lgu as string) ?? undefined;
  const permitExpiresOn = (data?.permit_expires_on as string) ?? undefined;
  const permitNotRequiredConfirmed = (data?.permit_not_required_confirmed as boolean) ?? property.permitNotRequiredConfirmed;
  const permitExemptionReason = (data?.permit_exemption_reason as string) ?? property.permitExemptionReason;
  const documentCategories = (data?.document_categories as string) ?? property.documentCategories;
  const documentApplicabilityDecision = (data?.document_applicability_decision as string) ?? property.documentApplicabilityDecision;

  // Get photos and permits from revision media or property
  const photoUrls = revision?.snapshotMedia
    ?.filter((m) => m.kind === "photo")
    .map((m) => m.url)
    .filter(Boolean) as string[]
    ?? property.photoUrls ?? [];

  const permitUrls = revision?.snapshotMedia
    ?.filter((m) => m.kind === "permit")
    .map((m) => m.url)
    .filter(Boolean) as string[]
    ?? property.permitUrls ?? [];

  const rows: Array<[string, string | number | null | undefined]> = [
    ["Title", title],
    ["Landlord", property.landlordName],
    ["Amenities", revision && Array.isArray(revision.snapshotPayload.amenities) ? revision.snapshotPayload.amenities.join(", ") : null],
    ["Bedrooms", unit?.bedrooms as number],
    ["Bathrooms", unit?.bathrooms as number],
    ["Furnishing", unit?.furnished_status as string],
    ["Status", isRevision ? `Revision (${revision?.reviewStatus ?? "pending"})` : statusLabel(property)],
    ["Monthly rent", typeof monthlyRent === "number" ? `${peso.format(monthlyRent)}/month` : null],
    ["Property type", propertyType],
    ["Rental type", rentalType],
    ["Floor area", typeof floorAreaSqm === "number" ? `${floorAreaSqm} sqm` : null],
    ["Max occupants", maxOccupants],
    ["Street address", streetAddress],
    ["Barangay", barangay],
    ["City", city],
    ["Postal code", postalCode],
    ["Latitude", latitude],
    ["Longitude", longitude],
    ["Document categories", documentCategories],
    ["Document decision", documentApplicabilityDecision],
    ["Permit applicability", permitApplicability],
    ["Permit number", permitNumber],
    ["Permit LGU", permitLgu],
    ["Permit expires", permitExpiresOn],
    ["Moderation note", property.moderationNote],
    ...(property.createdAt ? [["Submitted", formatAdminDate(property.createdAt)] as [string, string]] : []),
    ...(property.updatedAt ? [["Last updated", formatAdminDate(property.updatedAt)] as [string, string]] : []),
  ];

  return (
    <div className="grid gap-4">
      {isRevision && (
        <Alert variant="info" className="mb-2">
          Viewing pending revision (draft: {revision?.draftId?.slice(0, 8)}..., rev {revision?.expectedRevision}).
          The live listing remains visible to renters while this revision awaits review.
        </Alert>
      )}
      <p className="m-0 whitespace-pre-wrap break-words text-sm">{description ?? "No description provided."}</p>
      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        {rows.map(([label, value]) => <div key={label} className="contents"><dt className="font-medium text-muted-foreground">{label}</dt><dd className="m-0 break-words">{value ?? "—"}</dd></div>)}
      </dl>

      <ChecklistView property={{ ...property, monthlyRent, propertyType, rentalType, floorAreaSqm, maxOccupants, streetAddress, barangay, city, photoUrls, permitUrls }} />

      {!!photoUrls.length && (
        <div>
          <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Property photos</p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Photos">
            {photoUrls.map((url, i) => (
              <li key={url}>
                <Image src={url} alt={`${title ?? "Property"} photo ${i + 1}`} width={160} height={120} unoptimized className="h-[120px] w-40 rounded-lg border border-border object-cover" />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-1" aria-label="Permits">
        <p className="m-0 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permit & certification documents</p>
        {permitUrls.length ? (
          permitUrls.map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-action underline">
              <FileText size={16} aria-hidden="true" />
              Open permit {i + 1}
            </a>
          ))
        ) : (
          <p className="m-0 text-sm text-muted-foreground">No permits uploaded.</p>
        )}
      </div>

      {(permitNotRequiredConfirmed || permitExemptionReason) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
          <p className="m-0 font-semibold text-amber-800 dark:text-amber-300">Residential exemption declaration</p>
          {permitExemptionReason && (
            <p className="mb-0 mt-1 text-xs text-muted-foreground">{permitExemptionReason}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function ReviewCard({ property, onAction, onInspect }: { property: AdminProperty; onAction: (property: AdminProperty, action: ReviewAction) => void; onInspect: (property: AdminProperty) => void }) {
  const specs = unitSpecs(property);
  const place = [property.streetAddress, property.barangay, property.city].filter(Boolean).join(", ");
  return <article className="grid gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-action/30" aria-label={property.title ?? "Property"}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0 break-words text-base font-semibold">{property.title || "Untitled property"}</h3>
          {property.createdAt && (
            <span className="text-xs text-muted-foreground">· {formatAdminDate(property.createdAt)}</span>
          )}
        </div>
        <p className="m-0 mt-1 text-sm text-muted-foreground">{property.landlordName ?? "Unknown landlord"} · {typeof property.monthlyRent === "number" ? `${peso.format(property.monthlyRent)}/month` : "Rent not set"}</p>
        {place && <p className="m-0 mt-1 text-sm text-muted-foreground">{place}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {property.hasPendingRevision && <Badge variant="warning">Update pending review</Badge>}
        <Badge variant={property.status === "pending" ? "warning" : property.status === "approved" ? "default" : "secondary"}>{statusLabel(property)}</Badge>
      </div>
    </div>
    {property.description && <p className="m-0 line-clamp-2 break-words text-sm text-muted-foreground">{property.description}</p>}
    {!!specs.length && <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-muted-foreground" aria-label="Unit specs">{specs.map((spec) => <li key={spec}>{spec}</li>)}</ul>}
    {!!property.photoUrls?.length && <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0" aria-label="Photos">
      {property.photoUrls.map((url, i) => <li key={url}><Image src={url} alt={`${property.title ?? "Property"} photo ${i + 1}`} width={96} height={72} unoptimized className="h-[72px] w-24 rounded-lg border border-border object-cover" /></li>)}
    </ul>}
    {!!property.permitUrls?.length && <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {property.permitUrls.map((url, i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-action underline"><FileText size={14} aria-hidden="true" />View permit {i + 1}</a>)}
    </p>}
    {property.moderationNote && <p className="m-0 rounded-lg bg-muted p-2 text-sm">Moderation note: {property.moderationNote}</p>}
    <div className="flex flex-wrap gap-2 pt-1 border-t border-border/60">
      <Button size="sm" variant="outline" onClick={() => onInspect(property)}>Inspect details & permits</Button>
      {actionsFor(property.status).map((action) => <Button key={action} size="sm" variant={action === "approve" ? "primary" : "outline"} onClick={() => onAction(property, action)}>{actionCopy[action].button}</Button>)}
    </div>
  </article>;
}

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_desc", label: "Rent: High to Low" },
  { value: "price_asc", label: "Rent: Low to High" },
  { value: "title_asc", label: "Title: A–Z" },
];

export function AdminReviewQueue({ userId, initialStatus = "pending", initialSearch = "" }: { userId: string; initialStatus?: string; initialSearch?: string }) {
  const [status, setStatus] = useState(reviewTabs.some((t) => t.value === initialStatus) ? initialStatus : "pending");
  const [search, setSearch] = useState(initialSearch.slice(0, 100));
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [properties, setProperties] = useState<AdminProperty[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [documentDecision, setDocumentDecision] = useState("");
  const [inspecting, setInspecting] = useState<AdminProperty | null>(null);
  const [inspectingRevision, setInspectingRevision] = useState<PendingRevision | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(async () => {
      setProperties(null);
      setError(null);
      const all: AdminProperty[] = [];
      let offset = 0;
      const limit = 100;
      while (!abort.signal.aborted) {
        const query = new URLSearchParams({
          status,
          limit: String(limit),
          offset: String(offset),
          ...(search.trim() ? { search: search.trim() } : {}),
        });
        const result = await adminCall<{ properties?: AdminProperty[] }>(`/api/admin/properties?${query}`, userId, undefined, abort.signal);
        if (abort.signal.aborted) return;
        if (!result.ok) {
          setError(result.message);
          notify("error", "admin-properties-load", result.message);
          return;
        }
        const batch = Array.isArray(result.data.properties) ? result.data.properties : [];
        all.push(...batch);
        if (batch.length < limit || all.length >= 1000) break;
        offset += limit;
      }
      setProperties(all);
    }, search ? 300 : 0);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [status, search, userId, reloadKey]);

  const copy = dialog ? actionCopy[dialog.action] : null;
  const needsReason = !!copy && copy.minReason > 0;
  const invalid = needsReason && reasonProblem(reason, copy.minReason) !== null;

  const open = (property: AdminProperty, action: ReviewAction) => { setDialog({ property, action, operationId: newOperationId() }); setReason(""); setDocumentDecision(""); setDialogError(null); };
  const close = () => { if (!saving) setDialog(null); };

  const inspectController = useRef<AbortController | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  useEffect(() => () => { inspectController.current?.abort(); }, [userId]);
  const closeInspect = () => { inspectController.current?.abort(); setInspecting(null); setInspectingRevision(null); };
  const openInspect = async (property: AdminProperty) => {
    inspectController.current?.abort();
    const abort = new AbortController();
    inspectController.current = abort;
    setInspecting(property);
    setInspectingRevision(null);
    setInspectError(null);
    setInspectLoading(false);
    if (!property.hasPendingRevision) return;
    if (!property.submissionDraftId || !property.submissionExpectedRevision) {
      setInspectError("Submission revision is unavailable. Reload the queue.");
      return;
    }
    setInspectLoading(true);
    const query = new URLSearchParams({ draftId: property.submissionDraftId, revision: String(property.submissionExpectedRevision) });
    const result = await adminCall<{ revision?: PendingRevision }>(`/api/admin/properties/${property.id}/revision?${query}`, userId, undefined, abort.signal);
    if (abort.signal.aborted) return;
    setInspectLoading(false);
    const revision = result.ok ? result.data.revision : null;
    if (!revision || revision.draftId !== property.submissionDraftId || revision.expectedRevision !== property.submissionExpectedRevision || revision.reviewStatus !== "pending") {
      setInspectError(!result.ok ? result.message : "Revision changed. Reload the queue.");
      setReloadKey((key) => key + 1);
      return;
    }
    setInspectingRevision(revision);
  };

  async function confirm() {
    if (!dialog || !copy || invalid || saving) return;
    setSaving(true);
    setDialogError(null);
    const result = await submitReviewAction(userId, dialog, reason, documentDecision || null);
    setSaving(false);
    if (!result.ok) {
      setDialogError(result.message); notify("error", "admin-review-action", result.message);
      setReloadKey((key) => key + 1);
      return;
    }
    setProperties((list) => list?.map((p) => (p.id === result.property.id ? (p.hasPendingRevision ? { ...p, hasPendingRevision: false } : result.property) : p)) ?? list);
    setReloadKey((key) => key + 1);
    setDialog(null);
    notify("success", "admin-review-action", copy.success);
  }

  const sortedProperties = properties
    ? [...properties].sort((a, b) => {
        if (sortBy === "oldest") return (a.createdAt || "").localeCompare(b.createdAt || "");
        if (sortBy === "price_desc") return (b.monthlyRent ?? 0) - (a.monthlyRent ?? 0);
        if (sortBy === "price_asc") return (a.monthlyRent ?? 0) - (b.monthlyRent ?? 0);
        if (sortBy === "title_asc") return (a.title || "").localeCompare(b.title || "");
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      })
    : [];
  const totalPages = properties ? Math.max(1, Math.ceil(properties.length / pageSize)) : 1;
  const validPage = Math.min(page, totalPages);
  const paginatedProperties = sortedProperties.slice((validPage - 1) * pageSize, validPage * pageSize);

  return <section aria-label="Listing review queue" className="grid gap-4">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Review status">
      {reviewTabs.map((tab) => <Button key={tab.value} size="sm" variant={status === tab.value ? "primary" : "outline"} aria-pressed={status === tab.value} onClick={() => { setStatus(tab.value); setPage(1); }}>{tab.label}</Button>)}
    </div>
    <div className="grid gap-3 sm:grid-cols-[1fr_13rem]">
      <Input type="search" aria-label="Search listings" placeholder="Search title, address, or landlord…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
      <Select aria-label="Sort listings" options={sortOptions} value={sortBy} onValueChange={(val) => { setSortBy(val); setPage(1); }} />
    </div>
    {error ? <Alert variant="error">{error} <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button></Alert>
      : properties === null ? <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      : properties.length === 0 ? <Empty>No listings match this view.</Empty>
      : <>
          <div className="grid gap-3">{paginatedProperties.map((property) => <ReviewCard key={property.id} property={property} onAction={open} onInspect={openInspect} />)}</div>
          <Pagination currentPage={page} totalPages={totalPages} totalItems={properties.length} pageSize={pageSize} onPageChange={setPage} />
        </>}
    <Modal open={!!inspecting} onClose={closeInspect} title={inspecting?.hasPendingRevision ? "Inspect pending revision" : inspecting?.title || "Untitled property"} description="Property details and permits" className="max-h-[calc(100dvh-2rem)] lg:max-h-[85dvh] max-w-2xl overflow-y-auto">
      {inspectLoading ? <p role="status">Loading submitted revision…</p> : inspectError ? <Alert variant="error">{inspectError}</Alert> : inspecting && (!inspecting.hasPendingRevision || inspectingRevision) && <>
        <PropertyDetails property={inspecting} revision={inspectingRevision} />
        {inspectingRevision && <div className="mt-4 flex flex-wrap gap-2">{(["approve", "reject"] as const).map((action) => <Button key={action} onClick={() => {
          const property = { ...inspecting, submissionDraftId: inspectingRevision.draftId, submissionExpectedRevision: inspectingRevision.expectedRevision };
          closeInspect(); open(property, action);
        }}>{action === "approve" ? "Approve revision" : "Request revision changes"}</Button>)}</div>}
      </>}
    </Modal>
    <Modal open={!!dialog} onClose={close} title={copy?.title ?? ""} description={dialog ? `${dialog.property.title ?? "Property"} · ${statusLabel(dialog.property)}` : undefined} className="max-h-[calc(100dvh-2rem)] lg:max-h-[85dvh] overflow-y-auto">
      <div className="grid gap-4">
        {dialog?.action === "approve" && (
          <div className="grid gap-1.5">
            <label htmlFor="admin-doc-decision" className="text-xs font-medium text-foreground">
              Document verification decision (optional)
            </label>
            <Select
              id="admin-doc-decision"
              options={[
                { value: "", label: "Standard review" },
                { value: "documents_verified", label: "Documents verified" },
                { value: "exemption_accepted", label: "Exemption accepted" },
                { value: "documents_required", label: "Additional documents required" },
              ]}
              value={documentDecision}
              onValueChange={setDocumentDecision}
            />
          </div>
        )}
        {needsReason && copy && <AdminReasonField id="admin-review-reason" label={dialog?.action === "reject" ? "What should the landlord change?" : "Reason"} value={reason} min={copy.minReason} onChange={setReason} disabled={saving} />}
        {dialogError && <Alert variant="error">{dialogError}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
          <Button variant={dialog?.action === "approve" || dialog?.action === "restore" ? "primary" : "destructive"} onClick={confirm} disabled={saving || invalid}>{saving ? "Saving…" : copy?.confirm}</Button>
        </div>
      </div>
    </Modal>
  </section>;
}