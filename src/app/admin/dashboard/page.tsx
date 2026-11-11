import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Flag,
  ShieldAlert,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { AdminAuditEntries, type AuditEntry } from "@/features/admin/AdminAuditEntries";
import { AdminWorkspaceLayout } from "@/features/admin/AdminWorkspaceLayout";

export const dynamic = "force-dynamic";

type Overview = Record<string, number> & { recentAuditEntries?: AuditEntry[] };

// Canonical 8 KPIs required by tests and full system filtering
const kpis = [
  { key: "pendingReviewCount", label: "Pending review", href: "/admin/reviews?status=pending" },
  { key: "approvedLiveCount", label: "Approved / Live", href: "/admin/reviews?status=approved" },
  { key: "changesRequestedCount", label: "Changes requested", href: "/admin/reviews?status=rejected" },
  { key: "archivedListingCount", label: "Archived listings", href: "/admin/reviews?status=archived" },
  { key: "activeRenterCount", label: "Active renters", href: "/admin/accounts?role=renter&status=active" },
  { key: "activeLandlordCount", label: "Active landlords", href: "/admin/accounts?role=landlord&status=active" },
  { key: "suspendedAccountCount", label: "Suspended accounts", href: "/admin/accounts?status=suspended" },
  { key: "openReportCount", label: "Open abuse reports", href: "/admin/reports?status=open" },
];

async function loadOverview(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Overview | null> {
  try {
    const { data, error } = await (supabase as unknown as { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }> }).rpc("admin_dashboard_overview");
    if (
      !error &&
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      kpis.every(({ key }) => typeof (data as Record<string, unknown>)[key] === "number" && Number.isFinite((data as Record<string, number>)[key])) &&
      Array.isArray((data as Record<string, unknown>).recentAuditEntries)
    ) {
      return data as Overview;
    }
  } catch {
    // Show a retryable error without exposing provider details.
  }
  return null;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fadmin%2Fdashboard");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended,full_name,avatar_url").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin" || profile.is_suspended) notFound();
  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);
  const overview = await loadOverview(supabase);
  const recent = overview?.recentAuditEntries ?? [];

  const pendingCount = overview?.pendingReviewCount ?? 0;
  const openReportsCount = overview?.openReportCount ?? 0;
  const liveCount = overview?.approvedLiveCount ?? 0;
  const activeAccountsCount = (overview?.activeRenterCount ?? 0) + (overview?.activeLandlordCount ?? 0);

  return (
    <AdminWorkspaceLayout
      userId={user.id}
      displayName={profile.full_name}
      avatarUrl={avatarUrl}
      title="Admin dashboard"
      subtitle="Platform management and moderation overview."
    >
      {!overview ? (
        <section role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-foreground">
          <p>Could not load the admin overview. Please try again.</p>
          <a href="/admin/dashboard" className="inline-flex min-h-11 items-center font-semibold text-action underline">
            Try again
          </a>
        </section>
      ) : (
        <div className="space-y-6">
          {/* Main concept card: Admin overview */}
          <section className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm" aria-label="Platform overview">
            {/* Card Header */}
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-border/80">
              <div>
                <h2 className="m-0 text-xl font-bold tracking-tight text-foreground sm:text-2xl">Admin overview</h2>
                <p className="mt-1 text-sm text-muted-foreground">Platform management</p>
              </div>
            </div>

            {/* 2x2 Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-6 pb-6">
              {/* Top-Left: Pending reviews */}
              <Link
                href="/admin/reviews?status=pending"
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card/60 p-4 sm:p-5 transition hover:border-action/50 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <ClipboardCheck size={20} aria-hidden="true" />
                  </span>
                  <ArrowUpRight size={18} className="text-muted-foreground transition group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <p className="m-0 text-3xl font-bold tracking-tight tabular-nums text-foreground sm:text-4xl">
                    {pendingCount}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">Pending reviews</p>
                </div>
              </Link>

              {/* Top-Right: Open reports */}
              <Link
                href="/admin/reports?status=open"
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card/60 p-4 sm:p-5 transition hover:border-action/50 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Flag size={20} aria-hidden="true" />
                  </span>
                  <ArrowUpRight size={18} className="text-muted-foreground transition group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <p className="m-0 text-3xl font-bold tracking-tight tabular-nums text-foreground sm:text-4xl">
                    {openReportsCount}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">Open reports</p>
                </div>
              </Link>

              {/* Bottom-Left: Live listings */}
              <Link
                href="/admin/reviews?status=approved"
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card/60 p-4 sm:p-5 transition hover:border-action/50 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Building2 size={20} aria-hidden="true" />
                  </span>
                  <ArrowUpRight size={18} className="text-muted-foreground transition group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <p className="m-0 text-3xl font-bold tracking-tight tabular-nums text-foreground sm:text-4xl">
                    {liveCount}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">Live listings</p>
                </div>
              </Link>

              {/* Bottom-Right: Active accounts */}
              <Link
                href="/admin/accounts?role=&status=active"
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card/60 p-4 sm:p-5 transition hover:border-action/50 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Users size={20} aria-hidden="true" />
                  </span>
                  <ArrowUpRight size={18} className="text-muted-foreground transition group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <p className="m-0 text-3xl font-bold tracking-tight tabular-nums text-foreground sm:text-4xl">
                    {activeAccountsCount}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">Active accounts</p>
                </div>
              </Link>
            </div>

            {/* Needs Attention Panel */}
            <div className="rounded-2xl border border-border/90 bg-muted/20 p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/70">
                <h3 className="m-0 text-base font-bold text-foreground sm:text-lg">Needs attention</h3>
                <ArrowRight size={16} className="text-muted-foreground" aria-hidden="true" />
              </div>

              <div className="divide-y divide-border/60">
                {/* Item 1: Listing review queue */}
                <Link
                  href="/admin/reviews?status=pending"
                  className="group flex items-center justify-between gap-3 py-3.5 transition hover:text-action focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-action/10 text-action">
                      <ClipboardList size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-semibold text-foreground group-hover:text-action truncate">
                        Listing review queue
                      </p>
                      <p className="m-0 text-xs text-muted-foreground truncate">Inspect submissions awaiting approval</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pendingCount > 0 && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                        {pendingCount}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                </Link>

                {/* Item 2: Reports and moderation */}
                <Link
                  href="/admin/reports?status=open"
                  className="group flex items-center justify-between gap-3 py-3.5 transition hover:text-action focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <ShieldAlert size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-semibold text-foreground group-hover:text-action truncate">
                        Reports and moderation
                      </p>
                      <p className="m-0 text-xs text-muted-foreground truncate">Review unresolved safety concerns</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {openReportsCount > 0 && (
                      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                        {openReportsCount}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                </Link>
              </div>
            </div>

          </section>

          {/* Detailed breakdown section - preserves all canonical KPI links with the exact text spans needed by tests */}
          <section aria-label="Key metrics" className="space-y-3">
            <h3 className="m-0 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Status breakdown
            </h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map(({ key, label, href }) => (
                <Link
                  key={key}
                  href={href}
                  className="grid min-h-24 gap-1 rounded-xl border border-border bg-card p-3 sm:p-4 transition hover:border-action/40 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
                  <span className="text-2xl sm:text-3xl font-bold tabular-nums">
                    {typeof overview[key] === "number" ? overview[key] : 0}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Recent audit activity */}
          <section aria-label="Recent audit activity" className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-lg font-semibold">Recent audit activity</h2>
              <Link href="/admin/audit" className="inline-flex min-h-11 items-center font-semibold text-action underline">
                View audit log
              </Link>
            </div>
            {recent.length ? (
              <AdminAuditEntries entries={recent} />
            ) : (
              <p className="m-0 text-sm text-muted-foreground">No moderation activity yet.</p>
            )}
          </section>
        </div>
      )}
    </AdminWorkspaceLayout>
  );
}
