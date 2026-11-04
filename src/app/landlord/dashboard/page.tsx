import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { ArrowRight, Building2, ChevronDown, CircleAlert, ClipboardCheck, Clock3, Compass, HousePlus, LogOut, MapPinned, UserRound } from "lucide-react";
import { LandlordWorkspaceLayout } from "./LandlordWorkspaceLayout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Landlord workspace — AbangCebu",
  description: "Manage your rental properties, submissions, and permit review.",
};

export default async function LandlordDashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Flandlord%2Fdashboard");

  const { data: profile } = await supabase.from("profiles").select("full_name,avatar_url,role,is_suspended").eq("id", user.id).maybeSingle();
  if (profile?.role !== "landlord" || profile.is_suspended) notFound();
  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);

  const [totalResult, publishedResult, pendingResult, changesResult, listingsResult] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("status", "published").eq("is_available", true),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("status", "draft").not("submitted_at", "is", null).is("reviewed_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("status", "draft").not("reviewed_at", "is", null).not("rejection_reason", "is", null),
    supabase.from("listings").select("id,title,price,property_type,address,city,is_available,status,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(12),
  ]);

  const listings = listingsResult.data ?? [];
  const listingIds = listings.map((listing) => listing.id);
  const [reviewResult, permitResult] = await Promise.all([
    listingIds.length
      ? supabase.from("listings").select("id,submitted_at,reviewed_at,rejection_reason").eq("owner_id", user.id).in("id", listingIds)
      : Promise.resolve({ data: [], error: null }),
    listingIds.length
      ? supabase.from("listing_permit_reviews").select("listing_id,applicability,status,expires_on,rejection_reason").in("listing_id", listingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const reviewByListing = new Map((reviewResult.data ?? []).map((review) => [review.id, review]));
  const permitByListing = new Map((permitResult.data ?? []).map((permit) => [permit.listing_id, permit]));
  const hasPropertyError = Boolean(totalResult.error || publishedResult.error || listingsResult.error);
  const hasReviewError = Boolean(pendingResult.error || changesResult.error || reviewResult.error || permitResult.error);

  const todayInPhilippines = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const statusFor = (listing: (typeof listings)[number]) => {
    if (listing.status === "published") return listing.is_available
      ? { label: "Live · Available", tone: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" }
      : { label: "Published · Unavailable", tone: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" };
    const review = reviewByListing.get(listing.id);
    if (reviewResult.error) return { label: "Status unavailable", tone: "border-border bg-muted text-muted-foreground" };
    if (review?.reviewed_at && review.rejection_reason) return { label: "Action needed", tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200" };
    if (review?.submitted_at) return { label: "Under review", tone: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200" };
    return { label: "Draft", tone: "border-border bg-muted text-muted-foreground" };
  };
  const permitLabel = (permit: NonNullable<typeof permitResult.data>[number] | undefined) => {
    if (permitResult.error) return "Status unavailable";
    if (!permit) return "Not submitted";
    if (permit.status === "rejected") return "Changes requested";
    if (permit.status === "pending") return permit.applicability === "unknown" ? "Needs confirmation" : "Pending review";
    if (permit.applicability === "not_required") return "Not required";
    if (permit.expires_on && permit.expires_on < todayInPhilippines) return "Expired";
    return "Approved";
  };
  const statCards = [
    { label: "Total properties", value: totalResult.error ? null : totalResult.count ?? 0, detail: "Across your portfolio", Icon: Building2, tone: "bg-action/10 text-action" },
    { label: "Live listings", value: publishedResult.error ? null : publishedResult.count ?? 0, detail: "Published and available", Icon: Compass, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    { label: "Under review", value: pendingResult.error ? null : pendingResult.count ?? 0, detail: "Waiting for a decision", Icon: Clock3, tone: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
    { label: "Changes requested", value: changesResult.error ? null : changesResult.count ?? 0, detail: "Updates requested by review", Icon: CircleAlert, tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  ];
  const displayName = profile.full_name?.trim() || user.email?.split("@")[0] || "there";

  return <LandlordWorkspaceLayout
    brand={<Link href="/landlord/dashboard" className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label="AbangCebu landlord workspace">
      <Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} className="h-auto w-24 dark:hidden sm:w-32" loading="eager" />
      <Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} className="hidden h-auto w-24 dark:block sm:w-32" loading="eager" />
      <span className="hidden h-8 border-l border-border md:block" />
      <span className="hidden text-sm font-semibold text-muted-foreground md:block">Landlord workspace</span>
    </Link>}
    actions={<>
      <Link href="/landlord/map" aria-label="Open property map" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted sm:px-4">
        <MapPinned size={17} aria-hidden="true" /><span className="hidden sm:inline lg:hidden">Map</span><span className="hidden lg:inline">Property map</span>
      </Link>
      <details className="group relative">
        <summary aria-label={`Account options for ${displayName}`} title={displayName} className="inline-flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4 [&::-webkit-details-marker]:hidden">
          {avatarUrl
            ? <Image src={avatarUrl} alt="" width={28} height={28} unoptimized className="size-7 shrink-0 rounded-full border border-border object-cover" />
            : <span className="grid size-7 shrink-0 place-items-center rounded-full bg-action/10 text-action"><UserRound size={16} aria-hidden="true" /></span>}
          <span>Account</span><ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 grid min-w-48 gap-1 rounded-xl border border-border bg-card p-1 text-card-foreground shadow-xl">
          <Link href="/account" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <UserRound size={17} className="text-muted-foreground" aria-hidden="true" /> Manage account
          </Link>
          <Link href="/auth/logout" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <LogOut size={17} className="text-muted-foreground" aria-hidden="true" /> Sign out
          </Link>
        </div>
      </details>
    </>}
  >
        <section id="overview" className="scroll-mt-24 overflow-hidden rounded-3xl border border-action/15 bg-gradient-to-br from-action/15 via-card to-card p-5 shadow-sm sm:p-7 lg:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="m-0 text-xs font-bold uppercase tracking-[.15em] text-action">AbangCebu landlord workspace</p>
              <h1 className="mb-0 mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {displayName}</h1>
              <p className="mb-0 mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Manage your Cebu rentals, track review decisions, and keep your property listings up to date.</p>
            </div>
            <Link href="/list-property" className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-bold text-action-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-action-hover sm:w-auto sm:px-5">
              <HousePlus size={18} aria-hidden="true" /> List a property <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4" aria-label="Property overview">
          {statCards.map(({ label, value, detail, Icon, tone }) => <article key={label} className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
            <span className={"grid size-10 place-items-center rounded-xl " + tone}><Icon size={19} aria-hidden="true" /></span>
            <p className="mb-0 mt-4 text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mb-0 mt-1 text-3xl font-bold tabular-nums">{value ?? "—"}</p>
            <p className="mb-0 mt-1 hidden text-xs text-muted-foreground sm:block">{detail}</p>
          </article>)}
        </section>

        <section id="properties" className="scroll-mt-24" aria-labelledby="landlord-properties-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Your portfolio</p>
              <h2 id="landlord-properties-heading" className="mb-0 mt-1 text-xl font-bold sm:text-2xl">My properties</h2>
              <p className="mb-0 mt-1 text-sm text-muted-foreground">See which rentals are live and what needs your attention.</p>
            </div>
            <Link href="/list-property#my-submissions-heading" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-action hover:bg-action/10">
              All submissions <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {hasPropertyError && <div className="mb-3 flex flex-col items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100" role="alert">
            <CircleAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="m-0 font-semibold">{listingsResult.error ? "Your property workspace could not load its data." : "Some property totals could not be loaded."}</p>
              <p className="mb-0 mt-1 leading-relaxed">{listingsResult.error ? "Try again. If the issue continues, contact support to check your property workspace." : "Your latest properties remain available below. Try again to refresh the totals."}</p>
            </div>
            <Link href="/landlord/dashboard" prefetch={false} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white/70 px-3 font-semibold hover:bg-white dark:border-amber-800 dark:bg-slate-950/40 dark:hover:bg-slate-950">Try again</Link>
          </div>}

          {hasReviewError && !hasPropertyError && <div className="mb-3 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100" role="status">
            <CircleAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            <div><p className="m-0 font-semibold">Some review details are unavailable.</p><p className="mb-0 mt-1 leading-relaxed">Your property records are still available below. Submission or business-permit details may be missing until the landlord review setup is available.</p></div>
          </div>}

          {listingsResult.error
            ? null
            : listings.length === 0
              ? <div className="grid overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)]">
                <div className="flex flex-col items-start justify-center bg-gradient-to-br from-action/10 via-card to-card p-6 sm:p-8 lg:p-10">
                  <span className="grid size-12 place-items-center rounded-2xl bg-action/10 text-action"><Building2 size={22} aria-hidden="true" /></span>
                  <p className="mb-0 mt-5 text-xs font-bold uppercase tracking-[.14em] text-action">Your landlord workspace starts here</p>
                  <h3 className="mb-0 mt-2 text-xl font-bold sm:text-2xl">Add your first rental</h3>
                  <p className="mb-0 mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Create a clear listing so renters can find your property, understand what it offers, and check whether it fits their needs.</p>
                  <Link href="/list-property" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-bold text-action-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-action-hover sm:w-auto"><HousePlus size={17} aria-hidden="true" /> Add your first property <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                <div className="grid gap-3 border-t border-border bg-muted/35 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:p-6">
                  <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/80 p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-action/10 text-action"><HousePlus size={17} aria-hidden="true" /></span>
                    <div><p className="m-0 text-sm font-semibold">Describe your rental</p><p className="mb-0 mt-1 text-xs leading-relaxed text-muted-foreground">Set its name, type, rent, and details.</p></div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/80 p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><MapPinned size={17} aria-hidden="true" /></span>
                    <div><p className="m-0 text-sm font-semibold">Add location and photos</p><p className="mb-0 mt-1 text-xs leading-relaxed text-muted-foreground">Help renters see where it is and what it looks like.</p></div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/80 p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><ClipboardCheck size={17} aria-hidden="true" /></span>
                    <div><p className="m-0 text-sm font-semibold">Submit for review</p><p className="mb-0 mt-1 text-xs leading-relaxed text-muted-foreground">Track review and permit status from your portfolio.</p></div>
                  </div>
                </div>
              </div>
              : <ul className="m-0 grid list-none gap-3 p-0">
                {listings.map((listing) => {
                  const permit = permitByListing.get(listing.id);
                  const status = statusFor(listing);
                  return <li key={listing.id}>
                    <article className="grid min-w-0 gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="m-0 max-w-full truncate text-base font-bold sm:text-lg">{listing.title}</h3>
                          <span className={"rounded-full border px-2.5 py-1 text-xs font-semibold " + status.tone}>{status.label}</span>
                        </div>
                        <p className="mb-0 mt-1 truncate text-sm text-muted-foreground">{listing.address}, {listing.city}</p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                          <span>{listing.property_type}</span>
                          <span>Permit: {permitLabel(permit)}</span>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border pt-3 lg:justify-end lg:border-0 lg:pt-0">
                        <p className="m-0 text-base font-bold tabular-nums">{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(Number(listing.price))}<span className="ml-1 text-xs font-medium text-muted-foreground">/ month</span></p>
                        <Link href="/list-property#my-submissions-heading" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">Submissions <ArrowRight size={15} aria-hidden="true" /></Link>
                      </div>
                    </article>
                  </li>;
                })}
              </ul>}
        </section>
  </LandlordWorkspaceLayout>;
}
