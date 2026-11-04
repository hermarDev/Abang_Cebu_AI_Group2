import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountMapBackground } from "@/app/account/AccountMapBackground";
import { ListPropertyForm } from "./ListPropertyForm";
import { PermitResubmissionForm } from "./PermitResubmissionForm";

export const metadata: Metadata = { title: "List your property — AbangCebu", description: "Submit a Cebu rental property for review on AbangCebu." };

export default async function ListPropertyPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Flist-property");
  const { data: profile } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profile?.role !== "landlord" || profile.is_suspended) notFound();
  const { data: listings, error } = await supabase.from("listings").select("id,title,status,submitted_at,reviewed_at,rejection_reason,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(20);
  let permitReviews: Array<{ listing_id: string; applicability: "required" | "not_required" | "unknown"; status: "pending" | "approved" | "rejected"; expires_on: string | null; rejection_reason: string | null }> = [];
  let permitError: { message: string } | null = null;
  if (listings?.length) {
    const result = await supabase.from("listing_permit_reviews").select("listing_id,applicability,status,expires_on,rejection_reason")
      .in("listing_id", listings.map((listing) => listing.id));
    permitReviews = result.data ?? [];
    permitError = result.error;
  }
  const permitByListing = new Map(permitReviews.map((permit) => [permit.listing_id, permit]));

  return <main className="relative isolate h-[100dvh] overflow-hidden bg-transparent text-foreground">
    <AccountMapBackground />
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] bg-background/40 backdrop-blur-[1.5px]" />
    <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain">
    <div className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-6 sm:py-6">
      <header className="sticky top-3 z-20 mb-5 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border/70 bg-white/90 p-2 shadow-sm backdrop-blur-sm dark:bg-slate-950/90 sm:px-4">
        <Link href="/landlord/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowLeft size={18} aria-hidden="true" /> Back to dashboard</Link>
        <Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} className="h-auto w-28 dark:hidden sm:w-32" loading="eager" /><Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} className="hidden h-auto w-28 dark:block sm:w-32" loading="eager" />
      </header>
      <section className="mb-4 rounded-2xl border border-border/80 bg-card/95 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <p className="m-0 text-xs font-bold uppercase tracking-[.14em] text-action">Landlord workspace</p>
        <h1 className="mb-0 mt-2 text-3xl font-bold tracking-tight">List your property</h1>
        <p className="mb-0 mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Share your rental with Cebu renters. Each submission is checked before it appears in public search.</p>
      </section>
      <ListPropertyForm />
      <section className="mt-7 grid gap-3" aria-labelledby="my-submissions-heading">
        <h2 id="my-submissions-heading" className="m-0 text-xl font-semibold">Your submissions</h2>
        {error ? <p className="m-0 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800" role="alert">Your submission status could not be loaded. Refresh after the listing database migration is applied.</p> : !listings?.length ? <p className="rounded-xl border border-border bg-card/95 p-4 text-sm text-muted-foreground">You have not submitted a property yet.</p> : listings.map((listing) => {
          const rejected = Boolean(listing.reviewed_at && listing.rejection_reason);
          const status = listing.status === "published" ? "Published" : rejected ? "Changes requested" : listing.submitted_at ? "Pending review" : "Draft";
          const permit = permitByListing.get(listing.id);
          const todayInPhilippines = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
          const permitExpired = Boolean(permit?.status === "approved" && permit.applicability === "required" && permit.expires_on && permit.expires_on < todayInPhilippines);
          return <article className="rounded-xl border border-border bg-card/95 p-4 shadow-sm" key={listing.id}>
            <h3 className="m-0 font-semibold">{listing.title}</h3><span className="mt-2 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-bold text-action">{status}</span>
            {rejected && <p className="mb-0 mt-2 text-sm text-muted-foreground">Reviewer note: {listing.rejection_reason}</p>}
            {listing.status !== "published" && listing.submitted_at && <p className="mb-0 mt-2 text-xs text-muted-foreground">Submitted {new Date(listing.submitted_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}. Contact support about changes or resubmission.</p>}
            {permit && <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="m-0 text-sm font-semibold">Business permit: {permitExpired ? "Expired · hidden from renter search" : permit.status === "approved" ? (permit.applicability === "not_required" ? "Not required · confirmed" : "Approved") : permit.status === "rejected" ? "Rejected · update required" : "Pending review"}</p>
              <p className="mb-0 mt-1 text-xs text-muted-foreground">{permit.applicability === "required" ? "Permit submitted for this listing." : permit.applicability === "not_required" ? "You declared that a permit is not required for this rental." : "Confirm whether a permit is required for this rental."}</p>
              {permitExpired && <p className="mb-0 mt-2 text-sm text-amber-800">Update the permit to restore this property to renter search.</p>}
              {permit.status === "rejected" && permit.rejection_reason && <p className="mb-0 mt-2 text-sm text-muted-foreground">Reviewer note: {permit.rejection_reason}</p>}
              {((listing.status === "draft" && listing.submitted_at && !listing.reviewed_at && (permit.status === "rejected" || (permit.status === "pending" && permit.applicability === "unknown"))) || permitExpired) && <PermitResubmissionForm listingId={listing.id} applicability={permit.applicability} />}
            </div>}
          </article>;
        })}
        {permitError && <p className="m-0 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800" role="alert">Permit review details could not be loaded. Apply the landlord permit migration and refresh.</p>}
      </section>
    </div>
    </div>
  </main>;
}
