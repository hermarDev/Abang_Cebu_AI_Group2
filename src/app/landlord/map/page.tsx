import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LandlordPropertyMap, type LandlordPropertyMapItem } from "@/features/landlord/LandlordPropertyMap";
import { LandlordMobileNav } from "@/features/landlord/LandlordMobileNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your property map — AbangCebu" };

const hasCoordinates = (row: { latitude: unknown; longitude: unknown }) => row.latitude != null && row.longitude != null && Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)) && Math.abs(Number(row.latitude)) <= 90 && Math.abs(Number(row.longitude)) <= 180;

const PHOTO_PATH = /^[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f]{64}\.(?:jpg|png|webp)$/i;
type PhotoRef = string | { object_path?: string; path?: string };
type Submission = {
  property_id: string; draft_id: string; expected_revision: number; superseded_by: string | null;
  snapshot_media?: { kind?: string; object_path?: string }[] | null;
  snapshot_payload?: { media?: { photos?: PhotoRef[] }; property?: { description?: string | null }; amenities?: unknown } | null;
  submitted_payload?: { media?: { photos?: PhotoRef[] } } | null;
};

// Only photo-kind paths matching the owner-scoped pattern are returned, so permit files are never signed.
function photoPaths(submission?: Submission): string[] {
  if (!submission) return [];
  const raw = [
    ...(Array.isArray(submission.snapshot_media) ? submission.snapshot_media.filter(m => m?.kind === "photo").map(m => m.object_path) : []),
    ...[submission.snapshot_payload?.media?.photos, submission.submitted_payload?.media?.photos].flatMap(photos => Array.isArray(photos) ? photos.map(photo => typeof photo === "string" ? photo : photo?.object_path ?? photo?.path) : []),
  ];
  const seenLeaf = new Set<string>();
  return raw.filter((path): path is string => {
    if (typeof path !== "string" || !PHOTO_PATH.test(path)) return false;
    const leaf = path.split("/").pop()?.toLowerCase() ?? path;
    if (seenLeaf.has(leaf)) return false;
    seenLeaf.add(leaf);
    return true;
  });
}

function amenityLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => typeof item === "string" ? item : typeof item === "object" && item ? String((item as { label?: unknown; name?: unknown }).label ?? (item as { name?: unknown }).name ?? "") : "")
    .map(label => label.replaceAll("_", " ").trim()).filter(Boolean);
}

export default async function LandlordMapPage({ searchParams }: { searchParams?: Promise<{ selected?: string | string[] }> } = {}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Flandlord%2Fmap");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "landlord" || profile.is_suspended) notFound();
  const [params, { data, error }, { data: submitted, error: propertiesError }, { data: submittedDrafts, error: submissionsError }] = await Promise.all([
    searchParams,
    supabase.from("listings")
      .select("id,title,price,property_type,address,city,latitude,longitude,is_available,status,image_urls")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    // Column names follow supabase/migrations/20261104111000_property_unit_storage.sql grants.
    supabase.from("properties")
      .select("id,title,description,property_type,street_address,city,latitude,longitude,status")
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("property_submissions")
      .select("property_id,draft_id,expected_revision,superseded_by,snapshot_payload,snapshot_media")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const selected = params?.selected;
  const initialSelectedId = typeof selected === "string" ? selected : undefined;
  const propertyIds = (submitted ?? []).map(row => row.id);
  const { data: units, error: unitsError } = propertyIds.length
    ? await supabase.from("rental_units").select("property_id,monthly_rent,is_available").in("property_id", propertyIds)
    : { data: [], error: null };

  const draftTargets = new Map<string, { draftId: string; revision: number }>();
  const activeSubmissions = new Map<string, Submission>();
  for (const submission of (submittedDrafts ?? []) as Submission[]) {
    if (submission.superseded_by) continue;
    if (!activeSubmissions.has(submission.property_id)) activeSubmissions.set(submission.property_id, submission);
    if (!draftTargets.has(submission.property_id) && Number.isSafeInteger(submission.expected_revision) && submission.expected_revision > 0) {
      draftTargets.set(submission.property_id, { draftId: submission.draft_id, revision: submission.expected_revision });
    }
  }

  const paths = [...new Set((submitted ?? []).filter(hasCoordinates).flatMap(row => photoPaths(activeSubmissions.get(row.id))))];
  const signedByPath = new Map<string, string>();
  if (paths.length) {
    try {
      const { data: signed } = await createAdminClient().storage.from("property-draft-media").createSignedUrls(paths, 3600);
      for (const item of signed ?? []) if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
    } catch { /* Photos are optional; render the map without them if signing fails. */ }
  }

  const properties: LandlordPropertyMapItem[] = (submitted ?? []).filter(hasCoordinates).map(row => {
    const unit = (units ?? []).find(item => item.property_id === row.id);
    const target = draftTargets.get(row.id);
    const active = activeSubmissions.get(row.id);
    const amenities = amenityLabels(active?.snapshot_payload?.amenities);
    return {
      id: row.id, title: row.title, property_type: row.property_type, address: row.street_address, city: row.city,
      latitude: Number(row.latitude), longitude: Number(row.longitude), price: Number(unit?.monthly_rent ?? 0),
      is_available: unit?.is_available ?? true, status: row.status,
      imageUrls: photoPaths(active).map(path => signedByPath.get(path)).filter((url): url is string => Boolean(url)),
      description: row.description ?? active?.snapshot_payload?.property?.description ?? null,
      ...(amenities.length ? { amenities } : {}),
      editHref: (row.status === "pending" || row.status === "rejected") && target ? "/list-property?draftId=" + encodeURIComponent(target.draftId) + "&revision=" + target.revision : null,
    };
  });
  const seen = new Set(properties.map(property => property.id));
  for (const listing of (data ?? []).filter(hasCoordinates)) {
    const imageUrls = (listing as { image_urls?: unknown }).image_urls;
    if (!seen.has(listing.id)) properties.push({ ...listing, ...(Array.isArray(imageUrls) ? { imageUrls: imageUrls.filter((u): u is string => typeof u === "string") } : {}), price: Number(listing.price), latitude: Number(listing.latitude), longitude: Number(listing.longitude) });
  }

  return <main className="min-h-[100dvh] bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground lg:pb-0">
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/landlord/dashboard" aria-label="AbangCebu landlord workspace" className="flex min-w-0 items-center gap-3"><Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} unoptimized className="h-auto w-24 dark:hidden sm:w-32" loading="eager" /><Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} unoptimized className="hidden h-auto w-24 dark:block sm:w-32" loading="eager" /><span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground sm:inline">Property map</span></Link>
        <Link href="/landlord/dashboard" aria-label="Back to dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ArrowLeft size={17} aria-hidden="true" /><span className="hidden sm:inline">Back to dashboard</span><span className="sm:hidden">Dashboard</span></Link>
      </div>
    </header>
    <LandlordPropertyMap properties={properties} loadError={Boolean(error || propertiesError || unitsError || submissionsError)} initialSelectedId={initialSelectedId} />
    <LandlordMobileNav userId={user.id} />
  </main>;
}