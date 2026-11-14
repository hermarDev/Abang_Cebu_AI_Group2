import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Flag,
  MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { VerificationWorkspaceLayout } from "@/features/verification/VerificationWorkspaceLayout";

export const dynamic = "force-dynamic";

type QueueItem = {
  id: string;
  title: string;
  fieldVerificationStatus: "pending_verification" | "verified" | "flagged";
  landlordId: string;
  landlordName: string;
  landlordPhone: string;
};

export default async function VerificationDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login?next=%2Fverification%2Fdashboard");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_suspended,full_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    (profile?.role !== "verification_officer" && profile?.role !== "admin") ||
    profile.is_suspended
  ) {
    notFound();
  }

  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);

  const { data: queueItems, error: rpcError } = await supabase.rpc("verifier_list_queue", {
    p_status: null,
    p_search: null,
    p_limit: 100,
    p_offset: 0,
  });

  const items: QueueItem[] = Array.isArray(queueItems) ? queueItems : [];
  const pendingItems = items.filter((i) => i.fieldVerificationStatus === "pending_verification");
  const verifiedCount = items.filter((i) => i.fieldVerificationStatus === "verified").length;
  const flaggedCount = items.filter((i) => i.fieldVerificationStatus === "flagged").length;
  const pendingCount = pendingItems.length;

  // Take up to 5 latest pending items for "Needs inspection" panel
  const latestPending = pendingItems.slice(0, 5);

  const kpis = [
    {
      title: "Pending verification",
      count: pendingCount,
      href: "/verification/queue?status=pending_verification",
      Icon: MapPin,
      variant: "text-amber-500",
      bg: "bg-amber-500/10",
      description: "Submissions awaiting physical inspection or call",
    },
    {
      title: "Verified",
      count: verifiedCount,
      href: "/verification/queue?status=verified",
      Icon: CheckCircle2,
      variant: "text-emerald-500",
      bg: "bg-emerald-500/10",
      description: "Verified submissions ready for admin review",
    },
    {
      title: "Flagged",
      count: flaggedCount,
      href: "/verification/queue?status=flagged",
      Icon: Flag,
      variant: "text-rose-500",
      bg: "bg-rose-500/10",
      description: "Submissions with flagged discrepancy or issue",
    },
  ];

  return (
    <VerificationWorkspaceLayout
      userId={user.id}
      displayName={profile.full_name}
      avatarUrl={avatarUrl}
      title="Field Verification Dashboard"
      subtitle="Overview of landlord listing verifications, site visits, and pending inspection queues."
    >
      {rpcError ? (
        <section role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-foreground">
          <p>Could not load the verification queue. Please try again.</p>
          <Link href="/verification/dashboard" className="inline-flex min-h-11 items-center font-semibold text-action underline">
            Try again
          </Link>
        </section>
      ) : (
        <div className="grid gap-6">
          <section aria-label="Verification Statistics" className="grid gap-4 sm:grid-cols-3">
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
                    <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-foreground">{kpi.count}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-action group-hover:underline">
                    <span>View queue</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </section>

          <section aria-label="Needs inspection" className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h2 className="m-0 text-lg font-semibold text-foreground">Needs inspection</h2>
              <Link
                href="/verification/queue?status=pending_verification"
                className="inline-flex min-h-11 items-center gap-1 font-semibold text-action underline"
              >
                View all
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {latestPending.length > 0 ? (
              <div className="divide-y divide-border/60">
                {latestPending.map((item) => (
                  <Link
                    key={item.id}
                    href={`/verification/queue?status=pending_verification&propertyId=${item.id}`}
                    className="group flex items-center justify-between gap-3 py-3.5 transition hover:text-action focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <MapPin size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="m-0 text-sm font-semibold text-foreground group-hover:text-action truncate">
                          {item.title}
                        </p>
                        <p className="m-0 text-xs text-muted-foreground truncate">
                          {item.landlordName || "Landlord"}
                          {item.landlordPhone ? ` · ${item.landlordPhone}` : ""}
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="m-0 mt-4 text-sm text-muted-foreground text-center py-4">
                All submitted listings have been inspected.
              </p>
            )}
          </section>

          <section aria-label="Quick Actions" className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="inline-flex rounded-xl bg-action/10 p-3 text-action">
                <ClipboardList size={28} aria-hidden="true" />
              </span>
              <div>
                <h2 className="m-0 text-lg font-semibold">Field Verification Queue</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Inspect landlord listings, review submitted property coordinates, and log verification decisions.
                </p>
              </div>
            </div>
            <Link
              href="/verification/queue"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-5 text-sm font-medium text-action-foreground transition hover:bg-action-hover"
            >
              <span>Open Queue</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>

          <section aria-label="Standard Field Verification Workflow" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="m-0 text-base font-semibold text-foreground">Standard Field Verification Workflow</h2>
            <ol className="m-0 mt-3 list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
              <li>Review property submission details, landlord contact phone, and geolocation coordinates.</li>
              <li>Coordinate site visit, video inspection, or proxy meeting with the owner/representative.</li>
              <li>Record detailed notes (at least 5 characters) on premises, amenities, and occupancy safety.</li>
              <li>Upload proof images, verification documents, or signed meeting minutes to the secure bucket.</li>
              <li>Mark the property as verified to enable the final Admin listing review approval gate.</li>
            </ol>
          </section>
        </div>
      )}
    </VerificationWorkspaceLayout>
  );
}