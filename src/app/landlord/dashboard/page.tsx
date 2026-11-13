import Image from "next/image";
import Link from "next/link";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Building2, CircleAlert, Clock3, Compass, MapPinned } from "lucide-react";
import { AccountMenu } from "@/components/ui/AccountMenu";
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
    },
    {
      count: draftCount,
      href: "/landlord/properties?status=draft",
      text: `${draftCount} incomplete ${draftCount === 1 ? "draft" : "drafts"} in portfolio`,
      cta: "View drafts",
      Icon: Building2,
      tone: "bg-action/10 text-action dark:bg-primary/15 dark:text-primary",
    },
  ].filter((item) => item.count > 0);

  return (
    <LandlordWorkspaceLayout
      userId={user.id}
      propertiesCount={totalCount}
      brand={
        <Link href="/landlord/dashboard" aria-label="AbangCebu landlord workspace" className="flex min-w-0 items-center gap-3">
          <Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} unoptimized className="h-auto w-24 dark:hidden sm:w-32" loading="eager" />
          <Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} unoptimized className="hidden h-auto w-24 dark:block sm:w-32" loading="eager" />
          <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">Landlord workspace</span>
        </Link>
      }
      actions={
        <>
          <Link href="/landlord/map" aria-label="Open property map" className="hidden lg:inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <MapPinned size={17} aria-hidden="true" />
            <span>Property map</span>
          </Link>
          <AccountMenu displayName={displayName} avatarUrl={avatarUrl} role="Landlord" variant="header" />
        </>
      }
    >
      <section id="overview" className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {profile.full_name?.trim() || "landlord"}</h1>
            <p className="mb-0 mt-1 text-sm text-muted-foreground sm:text-base">Manage your rentals and keep track of your properties.</p>
          </div>
          <Link href="/list-property" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-bold text-action-foreground shadow-xs transition hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Add property <ArrowRight size={17} aria-hidden="true" />
          </Link>
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
            <p className="mb-0 mt-3 text-xs font-medium text-muted-foreground group-hover:text-foreground sm:text-sm">{label}</p>
            <p className="mb-0 mt-0.5 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">{value ?? "—"}</p>
            <p className="mb-0 mt-1 text-xs text-muted-foreground">{detail}</p>
          </Link>
        ))}
      </section>

      {attention.length > 0 && (
        <section id="needs-attention" aria-label="Needs attention" className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <h2 className="m-0 text-base font-bold sm:text-lg">Needs attention</h2>
          <ul className="mb-0 mt-3 grid list-none gap-2 p-0">
            {attention.map(({ href, text, cta, Icon, tone }) => (
              <li key={href}>
                <Link href={href} className="group flex min-h-11 items-center gap-3 rounded-xl border border-border/80 p-3 transition hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={17} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{text}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-action dark:text-primary">{cta} <ArrowRight size={15} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
