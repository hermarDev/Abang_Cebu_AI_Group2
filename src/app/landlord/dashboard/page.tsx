import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Building2, ChevronDown, CircleAlert, Clock3, Compass, LogOut, MapPinned, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { LandlordSubmissionsList } from "./LandlordSubmissionsList";
import { LandlordWorkspaceLayout } from "./LandlordWorkspaceLayout";

export const dynamic = "force-dynamic";

export default async function LandlordDashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Flandlord%2Fdashboard");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name,avatar_url,role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "landlord" || profile.is_suspended) notFound();
  const displayName = profile.full_name?.trim() || "landlord";

  const [avatarUrl, { data: listings, error }, { data: submissions, error: submissionError }, { data: submittedDrafts, error: correctionError }, { data: feedbackData, error: feedbackError }] = await Promise.all([
    signProfileAvatar(user.id, profile.avatar_url),
    supabase.from("listings")
      .select("id,title,status,is_available")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("properties")
      .select("id,title,status")
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("property_submissions")
      .select("property_id,draft_id,expected_revision,superseded_by")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("landlord_rejection_feedback"),
  ]);
  const propertyIds = (submissions ?? []).map(property => property.id);
  const { data: units, error: unitsError } = propertyIds.length
    ? await supabase.from("rental_units").select("property_id,is_available").in("property_id", propertyIds)
    : { data: [], error: null };
  // Unknown availability (read failed) is never counted live, so the stat cannot be inflated.
  const availableIds = new Set(unitsError ? [] : (units ?? []).filter(unit => unit.is_available).map(unit => unit.property_id));
  const correctionTargets = new Map<string, { draftId: string; revision: number }>();
  for (const submission of submittedDrafts ?? []) {
    if (!submission.superseded_by && !correctionTargets.has(submission.property_id) && Number.isSafeInteger(submission.expected_revision) && submission.expected_revision > 0) {
      correctionTargets.set(submission.property_id, { draftId: submission.draft_id, revision: submission.expected_revision });
    }
  }

  const feedback = new Map<string, string>();
  if (Array.isArray(feedbackData)) {
    for (const item of feedbackData) {
      if (typeof item?.propertyId === "string" && typeof item.reason === "string") feedback.set(item.propertyId, item.reason);
    }
  }

  const stats = [
    { label: "Total properties", value: error ? null : new Set([...(listings ?? []).map(l => l.id), ...(submissions ?? []).map(p => p.id)]).size, detail: "Properties in your portfolio", Icon: Building2 },
    { label: "Live listings", value: error ? null : (listings?.filter(listing => listing.status === "published" && listing.is_available).length ?? 0) + (submissions?.filter(property => property.status === "approved" && availableIds.has(property.id) && !listings?.some(l => l.id === property.id)).length ?? 0), detail: "Published and available", Icon: Compass },
    { label: "Under review", value: submissionError ? null : submissions?.filter(property => property.status === "pending").length ?? 0, detail: "Submitted and waiting for review", Icon: Clock3 },
    { label: "Changes requested", value: submissionError ? null : submissions?.filter(property => property.status === "rejected").length ?? 0, detail: "Rejected with notes", Icon: CircleAlert },
  ];

  const linkClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return <LandlordWorkspaceLayout
    userId={user.id}
    brand={<Link href="/landlord/dashboard" aria-label="AbangCebu landlord workspace" className="flex min-w-0 items-center gap-3"><Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} unoptimized className="h-auto w-24 dark:hidden sm:w-32" loading="eager" /><Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} unoptimized className="hidden h-auto w-24 dark:block sm:w-32" loading="eager" /><span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">Landlord workspace</span></Link>}
    actions={<>
      <Link href="/landlord/map" aria-label="Open property map" className="hidden lg:inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><MapPinned size={17} aria-hidden="true" /><span>Property map</span></Link>
      <details className="group relative">
        <summary aria-label={`Account options for ${displayName}`} title={displayName} className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">{avatarUrl ? <Image src={avatarUrl} alt="" width={28} height={28} unoptimized className="size-7 shrink-0 rounded-full border border-border object-cover" /> : <span className="grid size-7 shrink-0 place-items-center rounded-full bg-action/10 text-action"><UserRound size={16} aria-hidden="true" /></span>} <span>Account</span><ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 grid min-w-48 gap-1 rounded-xl border border-border bg-card p-1 text-card-foreground shadow-xl">
          <Link href="/account" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><UserRound size={17} aria-hidden="true" /> Account settings</Link>
          <Link href="/auth/logout" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><LogOut size={17} aria-hidden="true" /> Log out</Link>
        </div>
      </details>
    </>}
  >
    <section id="overview" className="rounded-3xl border border-border bg-card p-5 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[.15em] text-action">AbangCebu landlord workspace</p>
          <h1 className="mb-0 mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {profile.full_name?.trim() || "landlord"}</h1>
          <p className="mb-0 mt-2 text-sm text-muted-foreground sm:text-base">Manage your rentals and keep track of your properties.</p>
        </div>
        <Link href="/list-property" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-bold text-action-foreground hover:bg-action-hover">Open listing form <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </section>
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Property overview">
      {stats.map(({ label, value, detail, Icon }) => <article key={label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <span className="grid size-10 place-items-center rounded-xl bg-action/10 text-action"><Icon size={19} aria-hidden="true" /></span>
        <p className="mb-0 mt-4 text-sm text-muted-foreground">{label}</p>
        <p className="mb-0 mt-1 text-3xl font-bold tabular-nums">{value ?? "—"}</p>
        <p className="mb-0 mt-1 text-xs text-muted-foreground">{detail}</p>
      </article>)}
    </section>
    <section id="properties" aria-labelledby="properties-heading">
      <p className="mb-1 text-xs font-bold uppercase tracking-[.15em] text-action">Your portfolio</p>
      <h2 id="properties-heading" className="text-xl font-bold sm:text-2xl">My properties</h2>
      {error ? <p role="alert" className="mt-4">Could not load your properties. Refresh the page to try again.</p>
        : !listings?.length ? <div className="mt-4 rounded-3xl border border-border bg-card p-6"><h3 className="font-semibold">No properties yet</h3><p className="mt-2 text-sm text-muted-foreground">Your properties will appear here.</p></div>
        : <ul className="mt-4 grid list-none gap-3 p-0">{listings.map(listing => <li key={listing.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="font-semibold">{listing.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{listing.status === "published" ? listing.is_available ? "Published · Available" : "Published · Unavailable" : listing.status === "archived" ? "Archived" : "Draft"}</p>
        </li>)}</ul>}
    </section>
    <section id="submissions" aria-labelledby="submissions-heading">
      <p className="mb-1 text-xs font-bold uppercase tracking-[.15em] text-action">Listing review</p>
      <h2 id="submissions-heading" className="text-xl font-bold sm:text-2xl">Submitted properties</h2>
      {correctionError && !submissionError && <p role="alert" className="mt-4">Correction links could not be loaded. Refresh the page to try again.</p>}
      {feedbackError && <p role="alert" className="mt-4">Review feedback could not be loaded. Refresh the page to try again.</p>}
      {submissionError ? <p role="alert" className="mt-4">Could not load review status. Refresh the page to try again.</p>
        : !submissions?.length ? <p className="mt-4 text-sm text-muted-foreground">Submissions appear here with their review status.</p>
        : <LandlordSubmissionsList
            submissions={submissions}
            availableIds={Array.from(availableIds)}
            feedback={Object.fromEntries(feedback)}
            correctionTargets={Object.fromEntries(correctionTargets)}
            linkClass={linkClass}
            pageSize={10}
          />}
    </section>
  </LandlordWorkspaceLayout>;
}