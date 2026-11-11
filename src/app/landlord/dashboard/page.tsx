import Image from "next/image";
import Link from "next/link";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Building2, CircleAlert, Clock3, Compass, MapPinned } from "lucide-react";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { LandlordSubmissionsList } from "./LandlordSubmissionsList";
import { LandlordWorkspaceLayout } from "./LandlordWorkspaceLayout";

export const dynamic = "force-dynamic";

export default async function LandlordDashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  // A transient network failure is not a missing session; redirecting would bounce /login <-> here.
  if (authError && isAuthRetryableFetchError(authError)) return <main><p role="alert">Your account could not be checked. Please refresh the page to try again.</p></main>;
  if (authError || !user) redirect("/login?next=%2Flandlord%2Fdashboard");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name,avatar_url,role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "landlord" || profile.is_suspended) notFound();
  const displayName = profile.full_name?.trim() || "landlord";

  const [avatarUrl, { data: listings, error }, { data: submissions, error: submissionError }, { data: submittedDrafts, error: correctionError }, { data: feedbackData, error: feedbackError }] = await Promise.all([
    signProfileAvatar(user.id, profile.avatar_url),
    supabase.from("listings")
      .select("id,title,status,is_available,price,address,city,property_type,image_urls")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("properties")
      .select("id,title,status,street_address,city,property_type")
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
    ? await supabase.from("rental_units").select("property_id,is_available,monthly_rent").in("property_id", propertyIds)
    : { data: [], error: null };
  // Unknown availability (read failed) is never counted live, so the stat cannot be inflated.
  const availableIds = new Set(unitsError ? [] : (units ?? []).filter(unit => unit.is_available).map(unit => unit.property_id));
  const rentByPropertyId = new Map<string, number>();
  if (!unitsError) for (const unit of units ?? []) if (typeof unit.monthly_rent === "number" && !rentByPropertyId.has(unit.property_id)) rentByPropertyId.set(unit.property_id, unit.monthly_rent);
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

  const totalCount = error ? null : new Set([...(listings ?? []).map(l => l.id), ...(submissions ?? []).map(p => p.id)]).size;
  const stats = [
    { label: "Total properties", href: "/landlord/properties", value: totalCount, detail: "Properties in your portfolio", Icon: Building2, tone: "bg-action/10 text-action dark:bg-primary/15 dark:text-primary" },
    { label: "Live listings", href: "/landlord/properties?status=published", value: error ? null : (listings?.filter(listing => listing.status === "published" && listing.is_available).length ?? 0) + (submissions?.filter(property => property.status === "approved" && availableIds.has(property.id) && !listings?.some(l => l.id === property.id)).length ?? 0), detail: "Published and available", Icon: Compass, tone: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" },
    { label: "Under review", href: "/landlord/properties?status=pending", value: submissionError ? null : submissions?.filter(property => property.status === "pending").length ?? 0, detail: "Submitted and waiting for review", Icon: Clock3, tone: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
    { label: "Changes requested", href: "/landlord/properties?status=rejected", value: submissionError ? null : submissions?.filter(property => property.status === "rejected").length ?? 0, detail: "Rejected with notes", Icon: CircleAlert, tone: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" },
  ];

  const linkClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const rejectedCount = submissionError ? 0 : (submissions?.filter(p => p.status === "rejected").length ?? 0);
  const draftCount = error ? 0 : (listings?.filter(l => l.status === "draft").length ?? 0);
  const pendingCount = submissionError ? 0 : (submissions?.filter(p => p.status === "pending").length ?? 0);
  const attention = [
    { count: rejectedCount, href: "/landlord/properties?status=rejected", text: `${rejectedCount} ${rejectedCount === 1 ? "submission requires" : "submissions require"} updates`, cta: "Review items", Icon: CircleAlert, tone: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" },
    { count: draftCount, href: "/landlord/properties?status=draft", text: `${draftCount} incomplete ${draftCount === 1 ? "draft" : "drafts"} in portfolio`, cta: "View drafts", Icon: Building2, tone: "bg-action/10 text-action dark:bg-primary/15 dark:text-primary" },
    { count: pendingCount, href: "/landlord/properties?status=pending", text: `${pendingCount} ${pendingCount === 1 ? "property" : "properties"} awaiting review`, cta: "Check queue", Icon: Clock3, tone: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
  ].filter(item => item.count > 0);
  const hasApprovedSubmission = Boolean(submissions?.some(property => property.status === "approved"));

  return <LandlordWorkspaceLayout
    userId={user.id}
    propertiesCount={totalCount}
    brand={<Link href="/landlord/dashboard" aria-label="AbangCebu landlord workspace" className="flex min-w-0 items-center gap-3"><Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} unoptimized className="h-auto w-24 dark:hidden sm:w-32" loading="eager" /><Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} unoptimized className="hidden h-auto w-24 dark:block sm:w-32" loading="eager" /><span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">Landlord workspace</span></Link>}
    actions={<>
      <Link href="/landlord/map" aria-label="Open property map" className="hidden lg:inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><MapPinned size={17} aria-hidden="true" /><span>Property map</span></Link>
      <AccountMenu displayName={displayName} avatarUrl={avatarUrl} role="Landlord" variant="header" />
    </>}
  >
    <section id="overview" className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {profile.full_name?.trim() || "landlord"}</h1>
          <p className="mb-0 mt-1 text-sm text-muted-foreground sm:text-base">Manage your rentals and keep track of your properties.</p>
        </div>
        <Link href="/list-property" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-bold text-action-foreground shadow-xs transition hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Add property <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </section>
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Property overview">
      {stats.map(({ label, href, value, detail, Icon, tone }) => (
        <Link
          key={label}
          href={href}
          className="group relative block rounded-2xl border border-border bg-card p-4 shadow-xs transition hover:border-action/50 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5"
        >
          <span className={`grid size-10 place-items-center rounded-xl transition group-hover:scale-105 ${tone}`}>
            <Icon size={19} aria-hidden="true" />
          </span>
          <ArrowRight size={15} aria-hidden="true" className="absolute right-4 top-4 text-muted-foreground opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          <p className="mb-0 mt-3 text-xs font-medium text-muted-foreground group-hover:text-foreground sm:text-sm">{label}</p><p className="mb-0 mt-0.5 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">{value ?? "—"}</p>
          <p className="mb-0 mt-1 text-xs text-muted-foreground">{detail}</p>
        </Link>
      ))}
    </section>
    {attention.length > 0 && <section id="needs-attention" aria-label="Needs attention" className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <h2 className="m-0 text-base font-bold sm:text-lg">Needs attention</h2>
      <ul className="mb-0 mt-3 grid list-none gap-2 p-0">
        {attention.map(({ href, text, cta, Icon, tone }) => <li key={href}>
          <Link href={href} className="group flex min-h-11 items-center gap-3 rounded-xl border border-border/80 p-3 transition hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={17} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{text}</span>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-action dark:text-primary">{cta} <ArrowRight size={15} aria-hidden="true" /></span>
          </Link>
        </li>)}
      </ul>
    </section>}
    <section id="properties" aria-labelledby="properties-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 mt-0 text-xs font-bold uppercase tracking-[.15em] text-action">Your portfolio</p>
          <h2 id="properties-heading" className="m-0 text-xl font-bold sm:text-2xl">My properties</h2>
        </div>
        <Link href="/landlord/properties" className="shrink-0 text-sm font-semibold text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-primary">View all properties</Link>
      </div>
      {error ? <p role="alert" className="mt-4">Could not load your properties. Refresh the page to try again.</p>
        : !listings?.length ? <div className="mt-4 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-muted text-muted-foreground"><Building2 size={20} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><h3 className="m-0 text-base font-semibold">{hasApprovedSubmission ? "Published listings appear below" : submissions?.length ? "No published listings yet" : "No properties yet"}</h3><p className="mb-0 mt-1 text-sm text-muted-foreground">{hasApprovedSubmission ? "Your approved properties are displayed in your submissions queue below." : submissions?.length ? "Approved listings will appear here once published." : "Your properties will appear here."}</p></div>
          <Link href={submissions?.length ? "/landlord/properties" : "/list-property"} className="shrink-0 text-sm font-semibold text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-primary">{submissions?.length ? "Manage properties" : "Add property"}</Link>
        </div>
        : <ul className="mt-4 grid list-none gap-3 p-0">{listings.map(listing => {
          const meta = [[listing.address, listing.city].filter(Boolean).join(", "), listing.property_type, typeof listing.price === "number" ? `₱${listing.price.toLocaleString("en-PH")}/mo` : ""].filter(Boolean).join(" · ");
          const published = listing.status === "published";
          return <li key={listing.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:p-4">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground">
              {listing.image_urls?.[0] ? <Image src={listing.image_urls[0]} alt="" width={48} height={48} unoptimized className="size-12 object-cover" /> : <Building2 size={20} aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="m-0 truncate text-base font-semibold text-foreground">{listing.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${published && listing.is_available ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{published ? listing.is_available ? "Published · Available" : "Published · Unavailable" : listing.status === "archived" ? "Archived" : "Draft"}</span>
              </div>
              {meta && <p className="mb-0 mt-1 truncate text-sm text-muted-foreground">{meta}</p>}
            </div>
            <Link href="/landlord/properties" className="shrink-0 text-sm font-semibold text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-primary">Manage</Link>
          </li>;
        })}</ul>}
    </section>
    <section id="submissions" aria-labelledby="submissions-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 mt-0 text-xs font-bold uppercase tracking-[.15em] text-action">Listing review</p>
          <h2 id="submissions-heading" className="m-0 text-xl font-bold sm:text-2xl">Submitted properties</h2>
        </div>
        <Link href="/landlord/properties" className="shrink-0 text-sm font-semibold text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-primary">View all properties</Link>
      </div>
      {correctionError && !submissionError && <p role="alert" className="mt-4">Correction links could not be loaded. Refresh the page to try again.</p>}
      {feedbackError && <p role="alert" className="mt-4">Review feedback could not be loaded. Refresh the page to try again.</p>}
      {submissionError ? <p role="alert" className="mt-4">Could not load review status. Refresh the page to try again.</p>
        : !submissions?.length ? <p className="mt-4 text-sm text-muted-foreground">Submissions appear here with their review status.</p>
        : <LandlordSubmissionsList
            submissions={submissions.map(property => ({ ...property, monthly_rent: rentByPropertyId.get(property.id) ?? null }))}
            availableIds={Array.from(availableIds)}
            feedback={Object.fromEntries(feedback)}
            correctionTargets={Object.fromEntries(correctionTargets)}
            linkClass={linkClass}
            pageSize={10}
          />}
    </section>
  </LandlordWorkspaceLayout>;
}
