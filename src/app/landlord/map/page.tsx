import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/supabase/profile";
import { amenityLabels, fetchLandlordMapData, photoPaths, type SubmissionRow } from "@/server/landlord-properties";
import { LandlordPropertyMap, type LandlordPropertyMapItem } from "@/features/landlord/LandlordPropertyMap";
import { LandlordMobileNav } from "@/features/landlord/LandlordMobileNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your property map — AbangCebu" };

const hasCoordinates = (row: { latitude: unknown; longitude: unknown }) => row.latitude != null && row.longitude != null && Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)) && Math.abs(Number(row.latitude)) <= 90 && Math.abs(Number(row.longitude)) <= 180;

export default async function LandlordMapPage(props: { searchParams?: Promise<{ selected?: string | string[] }> }): Promise<React.JSX.Element>;
export default async function LandlordMapPage(): Promise<React.JSX.Element>;
export default async function LandlordMapPage(props?: { searchParams?: Promise<{ selected?: string | string[] }> }): Promise<React.JSX.Element> {
  const searchParams = props?.searchParams;
  const { user, profile, profileError } = await loadProfile();
  if (!user) redirect("/login?next=%2Flandlord%2Fmap");
  if (profileError || profile?.role !== "landlord" || profile.is_suspended) notFound();
  const supabase = await createClient();
  const [params, { listings: data, submitted, activeUnits, submittedDrafts, signedByPath, loadError }] = await Promise.all([
    searchParams,
    fetchLandlordMapData(supabase, user.id),
  ]);
  const selected = params?.selected;
  const initialSelectedId = typeof selected === "string" ? selected : undefined;
  type MapUnitRow = { property_id: string; monthly_rent: number | string | null; is_available: boolean };
  const unitsByProperty = new Map<string, MapUnitRow>();
  for (const unit of activeUnits) {
    if (!unitsByProperty.has(unit.property_id)) unitsByProperty.set(unit.property_id, unit);
  }

  const draftTargets = new Map<string, { draftId: string; revision: number }>();
  const activeSubmissions = new Map<string, SubmissionRow>();
  for (const submission of submittedDrafts) {
    if (submission.superseded_by) continue;
    if (!activeSubmissions.has(submission.property_id)) activeSubmissions.set(submission.property_id, submission);
    if (!draftTargets.has(submission.property_id) && Number.isSafeInteger(submission.expected_revision) && submission.expected_revision > 0) {
      draftTargets.set(submission.property_id, { draftId: submission.draft_id, revision: submission.expected_revision });
    }
  }

  const properties: LandlordPropertyMapItem[] = (submitted ?? []).filter(hasCoordinates).map(row => {
    const unit = unitsByProperty.get(row.id);
    const target = draftTargets.get(row.id);
    const active = activeSubmissions.get(row.id);
    const amenities = amenityLabels(active?.snapshot_payload?.amenities);
    return {
      id: row.id, title: row.title, property_type: row.property_type, address: row.street_address, city: row.city,
      latitude: Number(row.latitude), longitude: Number(row.longitude), price: Number(unit?.monthly_rent ?? 0),
      is_available: unit?.is_available ?? true, status: row.status,
      imageUrls: photoPaths(active, user.id).map(path => signedByPath.get(path)).filter((url): url is string => Boolean(url)),
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
    <LandlordPropertyMap properties={properties} loadError={loadError} initialSelectedId={initialSelectedId} />
    <LandlordMobileNav userId={user.id} />
  </main>;
}