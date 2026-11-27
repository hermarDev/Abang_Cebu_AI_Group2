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
import { DashboardAttentionQueue } from "@/components/dashboard/DashboardAttentionQueue";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/supabase/profile";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { SupportDeskWorkspaceLayout } from "@/features/support-desk/SupportDeskWorkspaceLayout";

export const dynamic = "force-dynamic";

type SupportAttentionRow = {
  id: string;
  ticket_number?: string | null;
  subject: string;
  status: string;
  priority?: string | null;
  requester_name?: string | null;
  created_at?: string | null;
};

type CountResult = { count?: number | null; error?: unknown };

async function runAttentionQuery(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{
  data: SupportAttentionRow[];
  error: unknown;
}> {
  try {
    const baseQuery = supabase
      .from("support_tickets")
      .select("id,ticket_number,subject,status,priority,requester_name,created_at")
      .in("status", ["open", "in_progress", "escalated"]);

    const orderedQuery =
      baseQuery && typeof (baseQuery as { order?: unknown }).order === "function"
        ? (baseQuery as { order: (col: string, opts: { ascending: boolean }) => unknown }).order("created_at", {
            ascending: false,
          })
        : baseQuery;

    const limitedQuery =
      orderedQuery && typeof (orderedQuery as { limit?: unknown }).limit === "function"
        ? (orderedQuery as { limit: (n: number) => unknown }).limit(5)
        : orderedQuery;

    const res = (await limitedQuery) as { data?: unknown; error?: unknown } | null;
    if (res?.error) return { data: [], error: res.error };
    const rows = Array.isArray(res?.data) ? (res.data as SupportAttentionRow[]) : [];
    return { data: rows.slice(0, 5), error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

export default async function SupportDeskDashboardPage() {
  const { user, profile, profileError } = await loadProfile();
  if (!user) redirect("/login?next=%2Fsupport-desk%2Fdashboard");

  const supabase = await createClient();

  if (
    profileError ||
    !profile ||
    (profile.role !== "customer_support" && profile.role !== "admin") ||
    profile.is_suspended
  ) {
    notFound();
  }

  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);

  const safeCount = async (promise: PromiseLike<CountResult>): Promise<CountResult> => {
    try {
      return await promise;
    } catch (err) {
      return { count: null, error: err };
    }
  };

  const [openRes, awaitingRes, escalatedRes, resolvedRes, attentionRes] = await Promise.all([
    safeCount(
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]),
    ),
    safeCount(
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "awaiting_landlord"),
    ),
    safeCount(
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "escalated"),
    ),
    safeCount(
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "resolved"),
    ),
    runAttentionQuery(supabase),
  ]);

  const hasCountError = Boolean(
    openRes.error || awaitingRes.error || escalatedRes.error || resolvedRes.error,
  );

  const openCount = openRes.error ? null : (openRes.count ?? 0);
  const awaitingCount = awaitingRes.error ? null : (awaitingRes.count ?? 0);
  const escalatedCount = escalatedRes.error ? null : (escalatedRes.count ?? 0);
  const resolvedCount = resolvedRes.error ? null : (resolvedRes.count ?? 0);

  const kpis = [
    {
      title: "Open complaints",
      count: openCount,
      href: "/support-desk/tickets?status=open",
      Icon: Clock,
      iconToneClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      description: "Complaints needing initial triage or ongoing review",
    },
    {
      title: "Awaiting Landlord",
      count: awaitingCount,
      href: "/support-desk/tickets?status=awaiting_landlord",
      Icon: AlertCircle,
      iconToneClassName: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      description: "Inquiries forwarded to reported landlords for response",
    },
    {
      title: "Escalated to Admin",
      count: escalatedCount,
      href: "/support-desk/tickets?status=escalated",
      Icon: ShieldAlert,
      iconToneClassName: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      description: "Complex disputes requiring suspension or listing unpublish",
    },
    {
      title: "Resolved",
      count: resolvedCount,
      href: "/support-desk/tickets?status=resolved",
      Icon: CheckCircle2,
      iconToneClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      description: "Successfully settled complaints and confirmed solutions",
    },
  ];

  const attentionItems = attentionRes.data.map((ticket) => {
    const isEscalated = ticket.status === "escalated";
    const statusLabel =
      ticket.status === "escalated"
        ? "Escalated"
        : ticket.status === "in_progress"
          ? "In progress"
          : "Open";
    const subtitle = [ticket.ticket_number, ticket.requester_name].filter(Boolean).join(" · ") || undefined;

    return {
      key: ticket.id,
      href: `/support-desk/tickets?status=${encodeURIComponent(ticket.status)}`,
      title: ticket.subject,
      subtitle,
      badge: statusLabel,
      badgeToneClassName: isEscalated
        ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
        : "bg-amber-500/20 text-amber-600 dark:text-amber-400",
      icon: isEscalated ? <ShieldAlert size={18} aria-hidden="true" /> : <Clock size={18} aria-hidden="true" />,
      iconToneClassName: isEscalated
        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    };
  });

  const greeting = profile.full_name?.trim()
    ? `Welcome back, ${profile.full_name.trim()}`
    : "Welcome back";

  return (
    <SupportDeskWorkspaceLayout
      userId={user.id}
      displayName={profile.full_name}
      avatarUrl={avatarUrl}
      title={greeting}
      subtitle="Monitor tenant complaints, landlord mediation, and escalation queues."
    >
      <div className="space-y-6">
        {hasCountError ? (
          <section role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-foreground">
            <p className="m-0">Could not load support ticket counts. Please try again.</p>
            <Link
              href="/support-desk/dashboard"
              className="inline-flex min-h-11 items-center font-semibold text-action underline"
            >
              Try again
            </Link>
          </section>
        ) : null}

        <section
          className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm"
          aria-label="Complaint Statistics"
        >
          <div className="flex items-start justify-between gap-4 pb-6 border-b border-border/80">
            <div>
              <h2 className="m-0 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Support overview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Complaint queues and escalations
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-6 pb-6">
            {kpis.map(({ title, count, href, Icon, iconToneClassName, description }) => (
              <DashboardStatCard
                key={title}
                href={href}
                label={title}
                value={count}
                description={description}
                iconToneClassName={iconToneClassName}
                icon={<Icon size={20} aria-hidden="true" />}
              />
            ))}
          </div>

          {attentionRes.error ? (
            <section role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-foreground">
              <p className="m-0">Could not load recent complaints requiring attention. Please try again.</p>
              <Link
                href="/support-desk/dashboard"
                className="inline-flex min-h-11 items-center font-semibold text-action underline"
              >
                Try again
              </Link>
            </section>
          ) : (
            <DashboardAttentionQueue
              title="Needs attention"
              action={{ href: "/support-desk/tickets", label: "View all" }}
              items={attentionItems}
              emptyMessage="No open or escalated complaints need attention right now."
            />
          )}
        </section>

        <section
          aria-label="Quick Actions"
          className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-action/10 text-action">
              <Headset size={24} aria-hidden="true" />
            </span>
            <div>
              <h2 className="m-0 text-base font-bold text-foreground sm:text-lg">Support Desk Queue</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Triage, communicate with landlords, resolve complaints, and escalate to administration.
              </p>
            </div>
          </div>
          <Link
            href="/support-desk/tickets"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-action px-5 text-sm font-medium text-action-foreground transition hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span>Open Queue</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </SupportDeskWorkspaceLayout>
  );
}
