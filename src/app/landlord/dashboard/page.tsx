import Image from "next/image";
import Link from "next/link";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Building2, CircleAlert, Clock3, Compass, MapPinned } from "lucide-react";
import { DashboardAttentionQueue } from "@/components/dashboard/DashboardAttentionQueue";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { fetchLandlordPortfolio } from "@/server/landlord-properties";
import { LandlordSubmissionsList } from "./LandlordSubmissionsList";
import { LandlordWorkspaceLayout } from "./LandlordWorkspaceLayout";

export const dynamic = "force-dynamic";

export default async function LandlordDashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  // A transient network failure is not a missing session; redirecting would bounce /login <-> here.
  if (authError && isAuthRetryableFetchError(authError)) {
    return (
      <main>
        <p role="alert">Your account could not be checked. Please refresh the page to try again.</p>
      </main>
    );
  }
  if (authError || !user) redirect("/login?next=%2Flandlord%2Fdashboard");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name,avatar_url,role,is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "landlord" || profile.is_suspended) notFound();
  const displayName = profile.full_name?.trim() || "landlord";

  const [avatarUrl, portfolio] = await Promise.all([
    signProfileAvatar(user.id, profile.avatar_url),
    fetchLandlordPortfolio(supabase, user.id),
  ]);

  const { items, errors } = portfolio;

  const totalCount = !errors.listings && !errors.properties && !errors.drafts ? items.length : null;
  const publishedCount = !errors.listings && !errors.properties ? items.filter((p) => p.status === "published").length : null;
  const underReviewCount = !errors.properties && !errors.submissions ? items.filter((p) => p.status === "pending" || p.hasPendingRevision).length : null;
  const changesRequestedCount = !errors.properties ? items.filter((p) => p.status === "rejected").length : null;

  const stats = [
    {
      label: "Total properties",
      href: "/landlord/properties",
      value: totalCount,
      detail: "Properties in your portfolio",
      Icon: Building2,
      tone: "bg-action/10 text-action dark:bg-primary/15 dark:text-primary",
    },
    {
      label: "Published",
      href: "/landlord/properties?status=published",
      value: publishedCount,
      detail: "Published listings in portfolio",
      Icon: Compass,
      tone: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    },
    {
      label: "Under review",
      href: "/landlord/properties?status=pending",
      value: underReviewCount,
      detail: "Submitted and waiting for review",
      Icon: Clock3,
      tone: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    },
    {
      label: "Changes requested",
      href: "/landlord/properties?status=rejected",
      value: changesRequestedCount,
      detail: "Rejected with notes",
      Icon: CircleAlert,
      tone: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
    },
  ];

  const linkClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  const rejectedCount = errors.properties ? 0 : items.filter((p) => p.status === "rejected").length;
  const draftCount = (errors.drafts || errors.listings) ? 0 : items.filter((p) => p.status === "draft").length;

  const attention = [
    {
      count: rejectedCount,
      href: "/landlord/properties?status=rejected",
      text: `${rejectedCount} ${rejectedCount === 1 ? "submission requires" : "submissions require"} updates`,
      cta: "Review items",
      Icon: CircleAlert,
      tone: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
      badgeTone: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
    },
    {
      count: draftCount,
      href: "/landlord/properties?status=draft",
      text: `${draftCount} incomplete ${draftCount === 1 ? "draft" : "drafts"} in portfolio`,
      cta: "View drafts",
      Icon: Building2,
      tone: "bg-action/10 text-action dark:bg-primary/15 dark:text-primary",
      badgeTone: "bg-action/15 text-action dark:text-primary",
    },
  ].filter((item) => item.count > 0);

  return (
    <LandlordWorkspaceLayout
      userId={user.id}
      displayName={displayName}
      avatarUrl={avatarUrl}
      propertiesCount={totalCount}
      brand={
        <Link href="/landlord/dashboard" aria-label="AbangCebu landlord workspace" className="flex min-w-0 items-center gap-3">
          <Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} unoptimized className="h-auto w-24 dark:hidden sm:w-32" loading="eager" />
          <Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} unoptimized className="hidden h-auto w-24 dark:block sm:w-32" loading="eager" />
          <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">Landlord workspace</span>
        </Link>
      }
      actions={
        <Link href="/landlord/map" aria-label="Open property map" className="hidden lg:inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <MapPinned size={17} aria-hidden="true" />
          <span>Property map</span>
        </Link>
      }
    >
      <div id="overview" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-3xl font-bold tracking-tight">Welcome back, {profile.full_name?.trim() || "landlord"}</h1>
          <p className="mt-2 text-muted-foreground">Manage your rentals and keep track of your properties.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/list-property" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-bold text-action-foreground shadow-xs transition hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Add property <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm" aria-label="Property overview">
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-border/80">
          <div>
            <h2 className="m-0 text-xl font-bold tracking-tight text-foreground sm:text-2xl">Portfolio overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">Listings and review status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-6 pb-6">
          {stats.map(({ label, href, value, detail, Icon, tone }) => (
            <DashboardStatCard
              key={label}
              href={href}
              label={label}
              value={value}
              description={detail}
              iconToneClassName={tone}
              icon={<Icon size={20} aria-hidden="true" />}
            />
          ))}
        </div>

        {attention.length > 0 && (
          <DashboardAttentionQueue
            id="needs-attention"
            title="Needs attention"
            items={attention.map(({ href, text, cta, count, Icon, tone, badgeTone }) => ({
              key: href,
              href,
              title: text,
              badge: count,
              badgeToneClassName: badgeTone,
              trailingLabel: cta,
              icon: <Icon size={18} aria-hidden="true" />,
              iconToneClassName: tone,
            }))}
          />
        )}
      </section>

      <section id="properties" aria-labelledby="properties-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="mb-1 mt-0 text-xs font-bold uppercase tracking-[.15em] text-action">Your portfolio</p>
            <h2 id="properties-heading" className="m-0 text-xl font-bold sm:text-2xl">My properties</h2>
          </div>
          <Link href="/landlord/properties" className="shrink-0 text-sm font-semibold text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-primary">
            View all properties
          </Link>
        </div>

        {errors.listings || errors.properties ? (
          <p role="alert" className="mt-4">Could not load your properties. Refresh the page to try again.</p>
        ) : null}
        {errors.drafts ? (
          <p role="alert" className="mt-4">Could not load saved drafts. Refresh the page to try again.</p>
        ) : null}
        {errors.submissions ? (
          <p role="alert" className="mt-4">Could not load review status. Refresh the page to try again.</p>
        ) : null}
        {errors.feedback ? (
          <p role="alert" className="mt-4">Review feedback could not be loaded. Refresh the page to try again.</p>
        ) : null}
        {errors.units ? (
          <p role="alert" className="mt-4">Unit availability and rent details could not be loaded. Refresh the page to try again.</p>
        ) : null}
        {errors.media ? (
          <p role="alert" className="mt-4">Property thumbnails could not be loaded. Refresh the page to try again.</p>
        ) : null}
        {portfolio.truncated ? (
          <p role="status" className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
            Showing the first 1,000 properties. Your portfolio contains more items than can be displayed at once.
          </p>
        ) : null}

        {!items.length && !errors.listings && !errors.properties && !errors.drafts ? (
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-muted text-muted-foreground">
              <Building2 size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-base font-semibold">No properties yet</h3>
              <p className="mb-0 mt-1 text-sm text-muted-foreground">Your properties will appear here.</p>
            </div>
            <Link href="/list-property" className="shrink-0 text-sm font-semibold text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-primary">
              Add property
            </Link>
          </div>
        ) : items.length > 0 ? (
          <LandlordSubmissionsList
            items={items}
            linkClass={linkClass}
            pageSize={10}
          />
        ) : null}
      </section>
    </LandlordWorkspaceLayout>
  );
}
