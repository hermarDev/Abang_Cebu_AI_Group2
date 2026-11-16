import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Flag,
  Map,
  MapPin,
} from "lucide-react";
import { DashboardAttentionQueue } from "@/components/dashboard/DashboardAttentionQueue";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
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

  const latestPending = pendingItems.slice(0, 5);

  const kpis = [
    {
      title: "Pending verification",
      count: pendingCount,
      href: "/verification/queue?status=pending_verification",
      Icon: MapPin,
      iconToneClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      description: "Submissions awaiting physical inspection or call",
    },
    {
      title: "Verified",
      count: verifiedCount,
      href: "/verification/queue?status=verified",
      Icon: CheckCircle2,
      iconToneClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      description: "Verified submissions ready for admin review",
    },
    {
      title: "Flagged",
      count: flaggedCount,
      href: "/verification/queue?status=flagged",
      Icon: Flag,
      iconToneClassName: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      description: "Submissions with flagged discrepancy or issue",
    },
  ];

  const greeting = profile.full_name?.trim()
    ? `Welcome back, ${profile.full_name.trim()}`
    : "Welcome back";

  return (
    <VerificationWorkspaceLayout
      userId={user.id}
      displayName={profile.full_name}
      avatarUrl={avatarUrl}
      title={greeting}
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
        <div className="space-y-6">
          <section
            className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm"
            aria-label="Verification Statistics"
          >
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-border/80">
              <div>
                <h2 className="m-0 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Verification overview
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Site visits and pending inspections
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

            <DashboardAttentionQueue
              title="Needs inspection"
              action={{ href: "/verification/queue?status=pending_verification", label: "View all" }}
              items={latestPending.map((item) => ({
                key: item.id,
                href: `/verification/queue?status=pending_verification&propertyId=${item.id}`,
                title: item.title,
                subtitle: `${item.landlordName || "Landlord"}${item.landlordPhone ? ` · ${item.landlordPhone}` : ""}`,
                icon: <MapPin size={18} aria-hidden="true" />,
                iconToneClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              }))}
              emptyMessage="All submitted listings have been inspected."
            />
          </section>

          <section
            aria-label="Quick Actions"
            className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-action/10 text-action">
                <ClipboardList size={24} aria-hidden="true" />
              </span>
              <div>
                <h2 className="m-0 text-lg font-semibold">Field Verification Queue</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Inspect landlord listings, review submitted property coordinates, and log verification decisions.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/verification/map"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Map size={16} aria-hidden="true" />
                <span>Verification map</span>
              </Link>
              <Link
                href="/verification/queue"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-5 text-sm font-medium text-action-foreground transition hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span>Open Queue</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section
            aria-label="Standard Field Verification Workflow"
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
          >
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                <span>Standard Field Verification Workflow</span>
                <ChevronDown
                  size={18}
                  className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <ol className="m-0 mt-3 list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
                <li>Review property submission details, landlord contact phone, and geolocation coordinates.</li>
                <li>Coordinate site visit, video inspection, or proxy meeting with the owner/representative.</li>
                <li>Record detailed notes (at least 5 characters) on premises, amenities, and occupancy safety.</li>
                <li>Upload proof images, verification documents, or signed meeting minutes to the secure bucket.</li>
                <li>Mark the property as verified to enable the final Admin listing review approval gate.</li>
              </ol>
            </details>
          </section>
        </div>
      )}
    </VerificationWorkspaceLayout>
  );
}
