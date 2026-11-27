import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PORTFOLIO_CACHE_LIMIT,
  PORTFOLIO_CACHE_TTL_MS,
  SIGNED_URL_CACHE_LIMIT,
  SIGNED_URL_CACHE_TTL_MS,
  boundedSet,
  getCacheEpoch,
  invalidateLandlordPortfolioCache,
  isCacheDisabled,
  mapCache,
  pendingMap,
  pendingPortfolio,
  portfolioCache,
  signedUrlCache,
} from "@/server/landlord-portfolio-cache";

export { invalidateLandlordPortfolioCache };

export const PHOTO_PATH = /^[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f]{64}\.(?:jpg|png|webp)$/i;

type PhotoRef = string | { object_path?: string; path?: string };

export type SubmissionRow = {
  property_id: string;
  draft_id: string;
  expected_revision: number;
  superseded_by: string | null;
  review_status?: string | null;
  snapshot_media?: { kind?: string; object_path?: string }[] | null;
  snapshot_payload?: {
    media?: { photos?: PhotoRef[] };
    property?: { description?: string | null; street_address?: string | null };
    amenities?: unknown;
  } | null;
  submitted_payload?: { media?: { photos?: PhotoRef[] } } | null;
};

export function photoPaths(submission: SubmissionRow | undefined, expectedOwnerId: string): string[] {
  if (!submission || !expectedOwnerId || !submission.draft_id) return [];
  const hasSnapshotMedia = Array.isArray(submission.snapshot_media);
  const raw = hasSnapshotMedia
    ? submission.snapshot_media!.filter((m) => m?.kind === "photo").map((m) => m.object_path)
    : [submission.snapshot_payload?.media?.photos, submission.submitted_payload?.media?.photos].flatMap((photos) =>
        Array.isArray(photos) ? photos.map((p) => (typeof p === "string" ? p : p?.object_path ?? p?.path)) : [],
      );
  const normalizedOwner = expectedOwnerId.toLowerCase();
  const normalizedDraft = submission.draft_id.toLowerCase();
  const seenLeaf = new Set<string>();
  return raw.filter((path): path is string => {
    if (typeof path !== "string" || !PHOTO_PATH.test(path)) return false;
    const [pathOwner, pathDraft] = path.toLowerCase().split("/");
    if (pathOwner !== normalizedOwner) return false;
    if (pathDraft !== normalizedDraft) return false;
    const leaf = path.split("/").pop()?.toLowerCase() ?? path;
    if (seenLeaf.has(leaf)) return false;
    seenLeaf.add(leaf);
    return true;
  });
}

export function amenityLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === "string"
        ? item
        : typeof item === "object" && item
          ? String((item as { label?: unknown; name?: unknown }).label ?? (item as { name?: unknown }).name ?? "")
          : "",
    )
    .map((label) => label.replaceAll("_", " ").trim())
    .filter(Boolean);
}

export type ManagedUnit = {
  id: string;
  unitNumber: string;
  rentalType: string;
  monthlyRent: number | null;
  maxOccupants: number | null;
  isAvailable: boolean;
};

export type LandlordManagedProperty = {
  id: string;
  title: string;
  propertyType: string;
  address: string;
  city: string;
  price: number | null;
  isAvailable: boolean;
  availabilityKnown?: boolean;
  totalUnitsCount?: number;
  availableUnitsCount?: number;
  units?: ManagedUnit[];
  /** unified status: "published" | "pending" | "rejected" | "draft" | "archived" */
  status: "published" | "pending" | "rejected" | "draft" | "archived";
  statusLabel: string;
  hasPendingRevision?: boolean;
  rejectionReason: string | null;
  thumbnailUrl: string | null;
  imageUrls: string[];
  description: string | null;
  amenities: string[];
  editHref: string | null;
  mapHref: string | null;
  previewHref: string | null;
  isDraftOnly?: boolean;
};

export type LandlordPortfolioErrors = {
  listings: boolean;
  properties: boolean;
  submissions: boolean;
  drafts: boolean;
  units: boolean;
  feedback: boolean;
  media: boolean;
};

export type LandlordPortfolioResult = {
  items: LandlordManagedProperty[];
  errors: LandlordPortfolioErrors;
  truncated: boolean;
};

export type LandlordMapData = {
  listings: Array<{
    id: string;
    title: string;
    price: number | string;
    property_type: string;
    address: string;
    city: string;
    latitude: unknown;
    longitude: unknown;
    is_available: boolean;
    status: "draft" | "pending" | "approved" | "rejected" | "published" | "archived";
    image_urls?: unknown;
  }>;
  submitted: Array<{
    id: string;
    title: string;
    description: string | null;
    property_type: string;
    street_address: string;
    city: string;
    latitude: unknown;
    longitude: unknown;
    status: "draft" | "pending" | "approved" | "rejected" | "published" | "archived";
  }>;
  activeUnits: Array<{ property_id: string; monthly_rent: number | string | null; is_available: boolean }>;
  submittedDrafts: SubmissionRow[];
  signedByPath: Map<string, string>;
  loadError: boolean;
};

/** Sign property-draft-media paths with a 1h bounded memory cache. */
export async function signPropertyDraftMediaUrls(
  paths: string[],
): Promise<{ signed: Map<string, string>; mediaError: boolean }> {
  const signed = new Map<string, string>();
  if (!paths.length) return { signed, mediaError: false };

  const now = Date.now();
  const bypassCache = isCacheDisabled();
  const missing: string[] = [];

  for (const path of paths) {
    if (!bypassCache) {
      const cached = signedUrlCache.get(path);
      if (cached && cached.expires > now) {
        signed.set(path, cached.url);
        continue;
      }
      if (cached) signedUrlCache.delete(path);
    }
    missing.push(path);
  }

  let mediaError = false;
  if (missing.length) {
    try {
      const { data, error } = await createAdminClient().storage.from("property-draft-media").createSignedUrls(missing, 3600);
      if (error) {
        mediaError = true;
      } else {
        const expires = Date.now() + SIGNED_URL_CACHE_TTL_MS;
        for (const item of data ?? []) {
          if (item.path && item.signedUrl) {
            signed.set(item.path, item.signedUrl);
            if (!bypassCache) {
              boundedSet(signedUrlCache, item.path, { expires, url: item.signedUrl }, SIGNED_URL_CACHE_LIMIT);
            }
          }
        }
      }
    } catch {
      mediaError = true;
    }
  }

  return { signed, mediaError };
}

export async function fetchActivePropertyUnits<TRow>(
  supabase: SupabaseClient,
  propertyIds: string[],
  selectColumns: string,
): Promise<{ units: TRow[]; error: boolean }> {
  if (!propertyIds.length) return { units: [], error: false };

  const UNIT_BATCH_SIZE = 100;
  const UNIT_PAGE_SIZE = 1000;
  const chunks: string[][] = [];
  for (let i = 0; i < propertyIds.length; i += UNIT_BATCH_SIZE) {
    chunks.push(propertyIds.slice(i, i + UNIT_BATCH_SIZE));
  }
  // Independent property chunks can be fetched in parallel; pagination inside
  // a chunk stays sequential because each page depends on the previous one.
  const chunkResults = await Promise.all(chunks.map(async (chunk) => {
    const chunkUnits: TRow[] = [];
    for (let from = 0; ; from += UNIT_PAGE_SIZE) {
      const unitsRes = await supabase
        .from("rental_units")
        .select(selectColumns)
        .in("property_id", chunk)
        .eq("is_retired", false)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + UNIT_PAGE_SIZE - 1);
      if (unitsRes.error) return { units: chunkUnits, error: true };
      const batch = (unitsRes.data ?? []) as TRow[];
      chunkUnits.push(...batch);
      if (batch.length < UNIT_PAGE_SIZE) break;
    }
    return { units: chunkUnits, error: false };
  }));

  const units: TRow[] = [];
  let hasError = false;
  for (const result of chunkResults) {
    units.push(...result.units);
    if (result.error) hasError = true;
  }
  return { units, error: hasError };
}

export async function fetchLandlordPortfolio(
  supabase: SupabaseClient,
  userId: string,
): Promise<LandlordPortfolioResult> {
  if (!isCacheDisabled()) {
    const cached = portfolioCache.get(userId);
    if (cached && cached.expires > Date.now()) return cached.data as LandlordPortfolioResult;
    if (cached) portfolioCache.delete(userId);
    const inFlight = pendingPortfolio.get(userId);
    if (inFlight) return inFlight as Promise<LandlordPortfolioResult>;
  }

  const startEpoch = getCacheEpoch();
  const promise = loadLandlordPortfolio(supabase, userId).then((result) => {
    const hasError = Object.values(result.errors).some(Boolean);
    if (!isCacheDisabled() && !hasError && getCacheEpoch() === startEpoch) {
      boundedSet(portfolioCache, userId, { expires: Date.now() + PORTFOLIO_CACHE_TTL_MS, data: result }, PORTFOLIO_CACHE_LIMIT);
    }
    return result;
  }).finally(() => {
    pendingPortfolio.delete(userId);
  });

  if (!isCacheDisabled()) {
    pendingPortfolio.set(userId, promise);
  }
  return promise;
}

async function loadLandlordPortfolio(
  supabase: SupabaseClient,
  userId: string,
): Promise<LandlordPortfolioResult> {
  const [
    listingsRes,
    propertiesRes,
    submissionsRes,
    feedbackRes,
    draftsRes,
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("id,title,price,property_type,address,city,is_available,status,image_urls,created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("properties")
      .select("id,title,description,property_type,street_address,city,status,created_at")
      .eq("landlord_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("property_submissions")
      .select("property_id,draft_id,expected_revision,superseded_by,review_status,snapshot_payload,snapshot_media,created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
    supabase.rpc("landlord_rejection_feedback"),
    supabase
      .from("property_drafts")
      .select("id,payload,revision,created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const listings = listingsRes.data;
  const properties = propertiesRes.data;
  const submissions = submissionsRes.data;
  const feedbackData = feedbackRes.data;
  const drafts = draftsRes.data;

  const listingsError = Boolean(listingsRes.error);
  const propertiesError = Boolean(propertiesRes.error);
  const submissionsError = Boolean(submissionsRes.error);
  const feedbackError = Boolean(feedbackRes.error);
  const draftsError = Boolean(draftsRes.error);

  const propertyIds = (properties ?? []).map((p) => p.id);
  type PortfolioUnitRow = {
    id: string;
    property_id: string;
    unit_number: string | null;
    rental_type: string | null;
    monthly_rent: number | null;
    max_occupants: number | null;
    is_available: boolean;
    is_retired?: boolean | null;
  };
  const { units, error: unitsError } = await fetchActivePropertyUnits<PortfolioUnitRow>(
    supabase,
    propertyIds,
    "id,property_id,unit_number,rental_type,monthly_rent,max_occupants,is_available",
  );

  const draftRevisionById = new Map<string, number>();
  for (const d of drafts ?? []) {
    if (typeof d?.id === "string" && Number.isSafeInteger(d.revision) && d.revision > 0) {
      draftRevisionById.set(d.id, d.revision);
    }
  }

  const activeSubmissions = new Map<string, SubmissionRow>();
  const draftTargets = new Map<string, { draftId: string; revision: number }>();
  for (const s of (submissions ?? []) as SubmissionRow[]) {
    if (s.superseded_by) continue;
    if (!activeSubmissions.has(s.property_id)) activeSubmissions.set(s.property_id, s);
    const liveRevision = draftRevisionById.get(s.draft_id) ?? s.expected_revision;
    if (!draftTargets.has(s.property_id) && Number.isSafeInteger(liveRevision) && liveRevision > 0) {
      draftTargets.set(s.property_id, { draftId: s.draft_id, revision: liveRevision });
    }
  }

  const feedback = new Map<string, string>();
  if (Array.isArray(feedbackData)) {
    for (const item of feedbackData) {
      if (typeof item?.propertyId === "string" && typeof item.reason === "string") {
        feedback.set(item.propertyId, item.reason);
      }
    }
  }

  // Collect photo paths to sign from property submissions (owner + draft bound)
  const paths = [...new Set((properties ?? []).flatMap((p) => photoPaths(activeSubmissions.get(p.id), userId)))];
  const { signed, mediaError } = await signPropertyDraftMediaUrls(paths);

  const unitsByPropertyId = new Map<string, typeof units>();
  for (const u of units) {
    const list = unitsByPropertyId.get(u.property_id);
    if (list) list.push(u);
    else unitsByPropertyId.set(u.property_id, [u]);
  }

  const items: LandlordManagedProperty[] = [];

  // 1. Submitted properties (approved/published, pending, rejected, archived)
  for (const p of properties ?? []) {
    const propUnits = unitsByPropertyId.get(p.id) ?? [];
    const totalUnitsCount = propUnits.length;
    const availableUnitsCount = propUnits.filter((u) => u.is_available).length;
    const unit = propUnits[0];
    const sub = activeSubmissions.get(p.id);
    const target = draftTargets.get(p.id);
    const photos = photoPaths(sub, userId).map((path) => signed.get(path)).filter((u): u is string => Boolean(u));
    const amenities = amenityLabels(sub?.snapshot_payload?.amenities);

    let status: LandlordManagedProperty["status"] = "pending";
    let statusLabel = "Pending review";
    let isAvailable = false;
    const availabilityKnown = !unitsError;
    const hasPendingRevision = p.status === "approved" && sub?.review_status === "pending";

    if (p.status === "approved") {
      status = "published";
      if (!availabilityKnown) {
        statusLabel = "Published · Availability unknown";
        isAvailable = false;
      } else if (totalUnitsCount > 1) {
        isAvailable = availableUnitsCount > 0;
        statusLabel =
          availableUnitsCount > 0
            ? `Published · ${availableUnitsCount} of ${totalUnitsCount} units available`
            : `Occupied · 0 of ${totalUnitsCount} available`;
      } else {
        isAvailable = unit?.is_available ?? false;
        statusLabel = unit?.is_available ? "Published · Available" : "Published · Unavailable";
      }
    } else if (p.status === "rejected") {
      status = "rejected";
      statusLabel = "Changes requested";
    } else if (p.status === "archived") {
      status = "archived";
      statusLabel = "Archived";
    }

    const editHref =
      (status === "pending" || status === "rejected" || status === "published") && target
        ? `/list-property?draftId=${encodeURIComponent(target.draftId)}&revision=${target.revision}${status === "published" ? "&lockedLocation=1" : ""}`
        : null;

    const mappedUnits: ManagedUnit[] = propUnits.map((u, idx) => ({
      id: u.id,
      unitNumber: u.unit_number || `Room ${idx + 1}`,
      rentalType: u.rental_type || "private_room",
      monthlyRent: typeof u.monthly_rent === "number" ? u.monthly_rent : null,
      maxOccupants: typeof u.max_occupants === "number" ? u.max_occupants : null,
      isAvailable: Boolean(u.is_available),
    }));

    items.push({
      id: p.id,
      title: p.title || "Untitled property",
      propertyType: p.property_type || "Rental",
      address: p.street_address || "",
      city: p.city || "Cebu City",
      price: typeof unit?.monthly_rent === "number" ? unit.monthly_rent : null,
      isAvailable,
      availabilityKnown,
      totalUnitsCount: totalUnitsCount > 1 ? totalUnitsCount : undefined,
      availableUnitsCount: totalUnitsCount > 1 ? availableUnitsCount : undefined,
      units: mappedUnits.length > 0 ? mappedUnits : undefined,
      status,
      statusLabel,
      hasPendingRevision,
      rejectionReason: feedback.get(p.id) ?? null,
      thumbnailUrl: photos[0] ?? null,
      imageUrls: photos,
      description: p.description ?? sub?.snapshot_payload?.property?.description ?? null,
      amenities,
      editHref,
      mapHref: `/landlord/map?selected=${encodeURIComponent(p.id)}`,
      previewHref: `/?selected=${encodeURIComponent(p.id)}`,
    });
  }

  // 2. Legacy / directly published listings (do NOT cross-dedupe against properties table)
  const seenListingIds = new Set<string>();
  for (const l of listings ?? []) {
    if (seenListingIds.has(l.id)) continue;
    seenListingIds.add(l.id);
    const imgs = Array.isArray(l.image_urls) ? l.image_urls.filter((u): u is string => typeof u === "string") : [];
    const status: LandlordManagedProperty["status"] =
      l.status === "published" ? "published" : l.status === "archived" ? "archived" : "draft";
    const statusLabel =
      status === "published"
        ? l.is_available ? "Published · Available" : "Published · Unavailable"
        : status === "archived" ? "Archived" : "Draft";
    items.push({
      id: l.id,
      title: l.title || "Untitled listing",
      propertyType: l.property_type || "Rental",
      address: l.address || "",
      city: l.city || "Cebu City",
      price: typeof l.price === "number" ? l.price : null,
      isAvailable: Boolean(l.is_available),
      availabilityKnown: true,
      status,
      statusLabel,
      hasPendingRevision: false,
      rejectionReason: null,
      thumbnailUrl: imgs[0] ?? null,
      imageUrls: imgs,
      description: null,
      amenities: [],
      editHref: null,
      mapHref: `/landlord/map?selected=${encodeURIComponent(l.id)}`,
      previewHref: `/?selected=${encodeURIComponent(l.id)}`,
    });
  }

  // 3. Saved drafts not yet submitted or superseded
  const submittedDraftIds = new Set((submissions ?? []).map((s) => s.draft_id));
  for (const d of drafts ?? []) {
    if (submittedDraftIds.has(d.id)) continue;
    const payload = d.payload && typeof d.payload === "object" ? (d.payload as Record<string, unknown>) : null;
    const prop = payload?.property && typeof payload.property === "object" ? (payload.property as Record<string, unknown>) : null;
    const unit = payload?.unit && typeof payload.unit === "object" ? (payload.unit as Record<string, unknown>) : null;
    const rawPrice = unit?.monthly_rent;
    const priceNum = typeof rawPrice === "number" ? rawPrice : typeof rawPrice === "string" ? Number(rawPrice) : null;
    const title = typeof prop?.title === "string" && prop.title.trim() ? prop.title.trim() : "Unfinished draft";
    const address = typeof prop?.street_address === "string" ? prop.street_address : "";
    const city = typeof prop?.city === "string" ? prop.city : "Cebu City";
    const propertyType = typeof prop?.property_type === "string" && prop.property_type ? prop.property_type : "Draft";
    const amenities = amenityLabels(payload?.amenities);

    items.push({
      id: `draft-${d.id}`,
      title,
      propertyType,
      address,
      city,
      price: Number.isFinite(priceNum) ? priceNum : null,
      isAvailable: false,
      availabilityKnown: true,
      status: "draft",
      statusLabel: "Draft",
      hasPendingRevision: false,
      rejectionReason: null,
      thumbnailUrl: null,
      imageUrls: [],
      description: typeof prop?.description === "string" ? prop.description : null,
      amenities,
      editHref: `/list-property?draftId=${encodeURIComponent(d.id)}&revision=${d.revision}`,
      mapHref: null,
      previewHref: null,
      isDraftOnly: true,
    });
  }

  const truncated = Boolean(
    (listings && listings.length >= 1000) ||
    (properties && properties.length >= 1000) ||
    (submissions && submissions.length >= 1000) ||
    (drafts && drafts.length >= 1000),
  );

  return {
    items,
    errors: {
      listings: listingsError,
      properties: propertiesError,
      submissions: submissionsError,
      drafts: draftsError,
      units: unitsError,
      feedback: feedbackError,
      media: mediaError,
    },
    truncated,
  };
}

export async function fetchLandlordManagedProperties(
  supabase: SupabaseClient,
  userId: string,
): Promise<LandlordManagedProperty[]> {
  const portfolio = await fetchLandlordPortfolio(supabase, userId);
  return portfolio.items;
}

const hasValidCoords = (row: { latitude: unknown; longitude: unknown }) =>
  row.latitude != null &&
  row.longitude != null &&
  Number.isFinite(Number(row.latitude)) &&
  Number.isFinite(Number(row.longitude)) &&
  Math.abs(Number(row.latitude)) <= 90 &&
  Math.abs(Number(row.longitude)) <= 180;

/** Load and cache landlord map portfolio data for 30s with in-flight deduplication. */
export async function fetchLandlordMapData(
  supabase: SupabaseClient,
  userId: string,
): Promise<LandlordMapData> {
  if (!isCacheDisabled()) {
    const cached = mapCache.get(userId);
    if (cached && cached.expires > Date.now()) return cached.data as LandlordMapData;
    if (cached) mapCache.delete(userId);
    const inFlight = pendingMap.get(userId);
    if (inFlight) return inFlight as Promise<LandlordMapData>;
  }

  const startEpoch = getCacheEpoch();
  const promise = (async (): Promise<LandlordMapData> => {
    const [{ data, error }, { data: submitted, error: propertiesError }, { data: submittedDrafts, error: submissionsError }] = await Promise.all([
      supabase.from("listings")
        .select("id,title,price,property_type,address,city,latitude,longitude,is_available,status,image_urls")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      // Column names follow supabase/migrations/20261104111000_property_unit_storage.sql grants.
      supabase.from("properties")
        .select("id,title,description,property_type,street_address,city,latitude,longitude,status")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("property_submissions")
        .select("property_id,draft_id,expected_revision,superseded_by,snapshot_payload,snapshot_media")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    const submittedRows = (submitted ?? []) as LandlordMapData["submitted"];
    const propertyIds = submittedRows.map((row) => row.id);
    const { units: activeUnits, error: unitsError } = await fetchActivePropertyUnits<LandlordMapData["activeUnits"][number]>(
      supabase,
      propertyIds,
      "property_id,monthly_rent,is_available",
    );

    const activeSubmissions = new Map<string, SubmissionRow>();
    for (const submission of (submittedDrafts ?? []) as SubmissionRow[]) {
      if (submission.superseded_by) continue;
      if (!activeSubmissions.has(submission.property_id)) activeSubmissions.set(submission.property_id, submission);
    }

    const paths = [...new Set(submittedRows.filter(hasValidCoords).flatMap((row) => photoPaths(activeSubmissions.get(row.id), userId)))];
    const { signed: signedByPath } = await signPropertyDraftMediaUrls(paths);
    const loadError = Boolean(error || propertiesError || unitsError || submissionsError);

    return {
      listings: (data ?? []) as LandlordMapData["listings"],
      submitted: submittedRows,
      activeUnits,
      submittedDrafts: (submittedDrafts ?? []) as SubmissionRow[],
      signedByPath,
      loadError,
    };
  })().then((result) => {
    if (!isCacheDisabled() && !result.loadError && getCacheEpoch() === startEpoch) {
      boundedSet(mapCache, userId, { expires: Date.now() + PORTFOLIO_CACHE_TTL_MS, data: result }, PORTFOLIO_CACHE_LIMIT);
    }
    return result;
  }).finally(() => {
    pendingMap.delete(userId);
  });

  if (!isCacheDisabled()) {
    pendingMap.set(userId, promise);
  }
  return promise;
}
