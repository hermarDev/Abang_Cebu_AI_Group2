import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Headset,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { SupportDeskWorkspaceLayout } from "@/features/support-desk/SupportDeskWorkspaceLayout";

export const dynamic = "force-dynamic";

export default async function SupportDeskDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fsupport-desk%2Fdashboard");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_suspended,full_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    (profile.role !== "customer_support" && profile.role !== "admin") ||
    profile.is_suspended
  ) {
    notFound();
  }

  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);

  const [openRes, awaitingRes, escalatedRes, resolvedRes] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_landlord"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "escalated"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved"),
  ]);

  const openCount = openRes.count ?? 0;
  const awaitingCount = awaitingRes.count ?? 0;
  const escalatedCount = escalatedRes.count ?? 0;
  const resolvedCount = resolvedRes.count ?? 0;

  const kpis = [
    {
      title: "Open complaints",
      count: openCount,
      href: "/support-desk/tickets?status=open",
      Icon: Clock,
      variant: "text-amber-500",
      bg: "bg-amber-500/10",
      description: "Complaints needing initial triage or ongoing review",
    },
    {
      title: "Awaiting Landlord",
      count: awaitingCount,
      href: "/support-desk/tickets?status=awaiting_landlord",
      Icon: AlertCircle,
      variant: "text-blue-500",
      bg: "bg-blue-500/10",
      description: "Inquiries forwarded to reported landlords for response",
    },
    {
      title: "Escalated to Admin",
      count: escalatedCount,
      href: "/support-desk/tickets?status=escalated",
      Icon: ShieldAlert,
      variant: "text-destructive",
      bg: "bg-destructive/10",
      description: "Complex disputes requiring suspension or listing unpublish",
    },
    {
      title: "Resolved",
      count: resolvedCount,
      href: "/support-desk/tickets?status=resolved",
      Icon: CheckCircle2,
      variant: "text-emerald-500",
      bg: "bg-emerald-500/10",
      description: "Successfully settled complaints and confirmed solutions",
    },
  ];

  return (
    <SupportDeskWorkspaceLayout
      userId={user.id}
      displayName={profile.full_name}
      avatarUrl={avatarUrl}
      title="Support Workspace Overview"
      subtitle="Monitor tenant complaints, landlord mediation, and escalation queues."
    >
      <div className="grid gap-6">
        <section aria-label="Complaint Statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.Icon;
            return (
              <Link
                key={kpi.title}
                href={kpi.href}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-action/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{kpi.title}</span>
                    <span className={`inline-flex rounded-xl p-2.5 ${kpi.bg} ${kpi.variant}`}>
                      <Icon size={20} aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{kpi.count}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-action group-hover:underline">
                  <span>View tickets</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </section>

        <section
          aria-label="Quick Actions"
          className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-4">
            <span className="inline-flex rounded-xl bg-action/10 p-3 text-action">
              <Headset size={28} aria-hidden="true" />
            </span>
            <div>
              <h2 className="m-0 text-lg font-semibold">Support Desk Queue</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Triage, communicate with landlords, resolve complaints, and escalate to administration.
              </p>
            </div>
          </div>
          <Link
            href="/support-desk/tickets"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-5 text-sm font-medium text-action-foreground transition hover:bg-action-hover"
          >
            <span>Open Queue</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </SupportDeskWorkspaceLayout>
  );
}
