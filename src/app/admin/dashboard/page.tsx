import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminAuditEntries, type AuditEntry } from "@/features/admin/AdminAuditEntries";
import { AdminWorkspaceLayout } from "@/features/admin/AdminWorkspaceLayout";

export const dynamic = "force-dynamic";

type Overview = Record<string, number> & { recentAuditEntries?: AuditEntry[] };

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
    if (!error && data && typeof data === "object" && !Array.isArray(data)
      && kpis.every(({ key }) => typeof (data as Record<string, unknown>)[key] === "number" && Number.isFinite((data as Record<string, number>)[key]))
      && Array.isArray((data as Record<string, unknown>).recentAuditEntries)) return data as Overview;
  } catch {
    // Show a retryable error without exposing provider details.
  }
  return null;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fadmin%2Fdashboard");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended,full_name").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin" || profile.is_suspended) notFound();
  const overview = await loadOverview(supabase);
  const recent = overview?.recentAuditEntries ?? [];

  return <AdminWorkspaceLayout userId={user.id} displayName={profile.full_name} title="Admin dashboard" subtitle="Live moderation counts. Select a card to open the matching list.">
    {!overview ? <section role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-foreground">
      <p>Could not load the admin overview. Please try again.</p>
      <a href="/admin/dashboard" className="inline-flex min-h-11 items-center font-semibold text-action underline">Try again</a>
    </section> : <>
    <section aria-label="Key metrics" className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map(({ key, label, href }) => <Link key={key} href={href} className="grid min-h-24 gap-1 rounded-xl border border-border bg-card p-3 sm:p-4 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl sm:text-3xl font-bold">{typeof overview[key] === "number" ? overview[key] : 0}</span>
      </Link>)}
    </section>
    <section aria-label="Recent audit activity" className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-lg font-semibold">Recent audit activity</h2>
        <Link href="/admin/audit" className="inline-flex min-h-11 items-center text-action underline">View audit log</Link>
      </div>
      {recent.length ? <AdminAuditEntries entries={recent} /> : <p className="m-0 text-sm text-muted-foreground">No moderation activity yet.</p>}
    </section>
    </>}
  </AdminWorkspaceLayout>;
}
