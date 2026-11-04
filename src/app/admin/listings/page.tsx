import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, FileText, MapPin } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reviewListing, reviewListingPermit } from "./actions";

export const metadata: Metadata = { title: "Listing review — AbangCebu", description: "Review landlord property submissions." };

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fadmin%2Flistings");
  const { data: profile } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.is_suspended) notFound();

  const query = await searchParams;
  const listingFields = "id,title,description,price,property_type,address,city,latitude,longitude,image_urls,submitted_at,status,reviewed_at";
  const { data: draftListings, error } = await supabase.from("listings")
    .select(listingFields)
    .not("submitted_at", "is", null).is("reviewed_at", null).eq("status", "draft")
    .order("submitted_at", { ascending: true }).limit(100);
  type PermitReview = { listing_id: string; owner_id: string; applicability: "required" | "not_required" | "unknown"; document_path: string | null; permit_number: string | null; issuing_lgu: string | null; expires_on: string | null; status: "pending" | "approved" | "rejected"; reviewed_by: string | null; reviewed_at: string | null; rejection_reason: string | null };
  let permits: PermitReview[] = [];
  let permitError: { message: string } | null = null;
  const { data: pendingPermitRows, error: pendingPermitError } = await supabase.from("listing_permit_reviews")
    .select("listing_id").eq("status", "pending").order("created_at", { ascending: true }).limit(100);
  permitError = pendingPermitError;
  const draftIds = (draftListings ?? []).map((listing) => listing.id);
  const renewalIds = (pendingPermitRows ?? []).map((permit) => permit.listing_id).filter((id) => !draftIds.includes(id));
  let renewalListings: NonNullable<typeof draftListings> = [];
  if (renewalIds.length) {
    const renewalResult = await supabase.from("listings").select(listingFields).in("id", renewalIds).eq("status", "published");
    renewalListings = renewalResult.data ?? [];
    permitError = permitError ?? renewalResult.error;
  }
  const listings = [...(draftListings ?? []), ...renewalListings];
  const signedPermitByListing = new Map<string, string>();
  if (listings?.length) {
    const result = await supabase.from("listing_permit_reviews")
      .select("listing_id,owner_id,applicability,document_path,permit_number,issuing_lgu,expires_on,status,reviewed_by,reviewed_at,rejection_reason")
      .in("listing_id", listings.map((listing) => listing.id));
    permits = result.data ?? [];
    permitError = permitError ?? result.error;
    await Promise.all(permits.filter((permit) => permit.document_path).map(async (permit) => {
      const { data } = await supabase.storage.from("listing-permits").createSignedUrl(permit.document_path!, 300);
      if (data?.signedUrl) signedPermitByListing.set(permit.listing_id, data.signedUrl);
    }));
  }
  const permitByListing = new Map(permits.map((permit) => [permit.listing_id, permit]));
  const notices: Record<string, string> = {
    invalid: "That review request was invalid. Refresh the queue and try again.",
    reason: "Add a review note of 10 to 500 characters before requesting changes.",
    stale: "This listing already has a decision or could not be updated. Refresh the queue and check its status.",
    approve: "Property approved and published to renter search.",
    reject: "Review note sent to the landlord. The property remains private.",
    permit_approve: "Permit document or not-required declaration approved.",
    permit_reject: "Permit review rejected. The landlord can update the permit details.",
    permit_invalid: "That permit review request was invalid. Refresh and try again.",
    permit_reason: "Add a permit review note of 10 to 500 characters before rejecting.",
    permit_stale: "This permit review is no longer pending or the document is expired. Refresh the queue and check its status.",
  };

  return <main className="min-h-[100dvh] bg-background text-foreground">
    <div className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-6 sm:py-6">
      <header className="sticky top-3 z-20 mb-5 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-sm backdrop-blur-sm sm:px-4">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowLeft size={18} aria-hidden="true" /> Back to map</Link>
        <span className="text-sm font-semibold">AbangCebu · Admin review</span>
      </header>
      <section className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <p className="m-0 text-xs font-bold uppercase tracking-[.14em] text-action">Admin workspace</p>
        <h1 className="mb-0 mt-2 text-3xl font-bold">Property submissions</h1>
        <p className="mb-0 mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Review landlord submissions and permit renewals. A listing is available to renters only while its required permit is approved and current.</p>
      </section>
      {query.error && notices[query.error] && <p className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{notices[query.error]}</p>}
      {query.success && notices[query.success] && <p className="mb-4 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-800" role="status">{notices[query.success]}</p>}
      {error || permitError ? <p className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800" role="alert">The review queue or permit checks could not be loaded. Apply the landlord listing and business permit migrations, then refresh.</p> : !listings?.length ? <section className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">There are no properties waiting for review.</section> : <div className="grid gap-4">
        {listings.map((listing) => {
          const permit = permitByListing.get(listing.id);
          const todayInPhilippines = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
          const permitIsCurrent = Boolean(permit?.expires_on && permit.expires_on >= todayInPhilippines);
          const permitApproved = permit?.status === "approved" && (permit.applicability === "not_required" || (permitIsCurrent && signedPermitByListing.has(listing.id)));
          const canApprovePermit = permit?.applicability === "not_required" || (permit?.applicability === "required" && permitIsCurrent && signedPermitByListing.has(listing.id));
          return <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" key={listing.id}>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div><p className="mb-1 text-xs font-bold uppercase tracking-wide text-action">{listing.status === "published" ? "Permit renewal · " : ""}{listing.property_type.replaceAll("_", " ")}</p><h2 className="m-0 text-xl font-semibold">{listing.title}</h2></div>
            <strong className="text-action">₱{Number(listing.price).toLocaleString("en-PH")} / month</strong>
          </div>
          {listing.image_urls?.length ? <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{listing.image_urls.map((url: string, index: number) => <Image key={url} src={url} alt={listing.title + " photo " + (index + 1)} width={420} height={280} unoptimized className="h-32 w-full rounded-xl object-cover" />)}</div> : <p className="text-sm text-muted-foreground">No photos attached.</p>}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{listing.description}</p>
          <p className="flex items-start gap-2 text-sm"><MapPin size={17} className="mt-0.5 shrink-0" aria-hidden="true" />{listing.address}, {listing.city} · {Number(listing.latitude).toFixed(4)}, {Number(listing.longitude).toFixed(4)}</p>
          <section className="mt-4 rounded-xl border border-border bg-muted/30 p-4" aria-label="Business permit review">
            <div className="flex items-start gap-3"><FileText size={19} className="mt-0.5 shrink-0 text-action" aria-hidden="true" /><div className="min-w-0 flex-1">
              <h3 className="m-0 text-base font-semibold">Business permit check</h3>
              {!permit ? <p className="mb-0 mt-2 text-sm text-rose-800">No permit record is available. Keep the property private until the permit migration and landlord details are resolved.</p> : <>
                <p className="mb-0 mt-1 text-sm"><strong>Review status:</strong> {permit.status === "pending" ? "Pending" : permit.status === "approved" ? "Approved" : "Rejected"}</p>
                <p className="mb-0 mt-1 text-sm"><strong>Landlord declaration:</strong> {permit.applicability === "required" ? "Permit required" : permit.applicability === "not_required" ? "Permit not required" : "Applicability not recorded"}</p>
                {permit.permit_number && <p className="mb-0 mt-1 text-sm"><strong>Permit number:</strong> {permit.permit_number}</p>}
                {permit.issuing_lgu && <p className="mb-0 mt-1 text-sm"><strong>Issuing LGU:</strong> {permit.issuing_lgu}</p>}
                {permit.expires_on && <p className="mb-0 mt-1 text-sm"><strong>Valid through:</strong> {new Date(permit.expires_on + "T00:00:00").toLocaleDateString("en-PH", { dateStyle: "medium" })}</p>}
                {permit.document_path && (signedPermitByListing.has(listing.id) ? <a className="mt-2 inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-3 text-sm font-semibold text-action underline" href={signedPermitByListing.get(listing.id)} target="_blank" rel="noreferrer">Open private permit document</a> : <p className="mb-0 mt-2 text-sm text-rose-800">Permit file could not be opened. Do not approve it until the file is accessible.</p>)}
                {permit.rejection_reason && <p className="mb-0 mt-2 text-sm text-rose-800"><strong>Previous note:</strong> {permit.rejection_reason}</p>}
                {permit.status === "pending" && permit.applicability !== "unknown" && <form action={reviewListingPermit} className="mt-4 grid gap-3 border-t border-border pt-3">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <label className="grid gap-1.5 text-sm font-medium">Permit review note (required when rejecting)<textarea className="min-h-16 rounded-lg border border-border bg-card p-3 font-normal" name="permitReason" minLength={10} maxLength={500} placeholder="Explain what should be corrected if rejecting." /></label>
                  <div className="flex flex-wrap gap-2"><button type="submit" name="permitDecision" value="approve" disabled={!canApprovePermit} className="min-h-10 rounded-lg bg-action px-3 text-sm font-semibold text-action-foreground disabled:cursor-not-allowed disabled:opacity-50">{permit.applicability === "required" ? "Approve permit" : "Confirm permit not required"}</button><button type="submit" name="permitDecision" value="reject" className="min-h-10 rounded-lg border border-border bg-card px-3 text-sm font-semibold">Reject permit details</button></div>
                  <p className="m-0 text-xs text-muted-foreground">Approval confirms this document or declaration was reviewed by AbangCebu; it is not an LGU endorsement.</p>
                </form>}
                {permit.applicability === "unknown" && <p className="mb-0 mt-3 text-sm text-amber-800">The landlord must confirm whether a permit is required before the permit check can be decided.</p>}
              </>}
            </div></div>
          </section>
          {listing.status === "draft" && <form action={reviewListing} className="mt-4 grid gap-3 border-t border-border pt-4">
            <input type="hidden" name="listingId" value={listing.id} />
            <label className="grid gap-1.5 text-sm font-medium">Review note (required when requesting changes)<textarea className="min-h-20 rounded-lg border border-border bg-card p-3 font-normal" name="reason" minLength={10} maxLength={500} placeholder="Explain what the landlord should correct." /></label>
            {!permitApproved && <p className="m-0 text-sm text-amber-800">Approve the permit document or confirm that no permit is required before publishing.</p>}
            <div className="flex flex-wrap gap-2"><button type="submit" name="decision" value="approve" disabled={!permitApproved} className="min-h-11 rounded-lg bg-action px-4 font-semibold text-action-foreground disabled:cursor-not-allowed disabled:opacity-50">Approve and publish</button><button type="submit" name="decision" value="reject" className="min-h-11 rounded-lg border border-border bg-card px-4 font-semibold text-foreground">Request changes</button></div>
          </form>
          }
        </article>;
        })}
      </div>}
    </div>
  </main>;
}
