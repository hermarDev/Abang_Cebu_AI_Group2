import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Flag, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { VerificationWorkspaceLayout } from "@/features/verification/VerificationWorkspaceLayout";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

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

  // Fetch count statistics
  const { data: queueItems } = await supabase.rpc("verifier_list_queue", {
    p_status: null,
    p_search: null,
    p_limit: 100,
    p_offset: 0,
  });

  const items = Array.isArray(queueItems) ? queueItems : [];
  const pendingCount = items.filter((i) => i.fieldVerificationStatus === "pending_verification").length;
  const verifiedCount = items.filter((i) => i.fieldVerificationStatus === "verified").length;
  const flaggedCount = items.filter((i) => i.fieldVerificationStatus === "flagged").length;

  return (
    <VerificationWorkspaceLayout
      userId={user.id}
      displayName={profile.full_name}
      avatarUrl={avatarUrl}
      title="Field Verification Dashboard"
      subtitle="Overview of landlord listing verifications, site visits, and pending inspection queues."
      actions={
        <Link href="/verification/queue">
          <Button variant="primary" className="gap-1.5">
            <ClipboardList size={16} aria-hidden="true" />
            Open Queue
          </Button>
        </Link>
      }
    >
      <div className="grid gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Verification</span>
              <MapPin size={18} className="text-amber-500" />
            </div>
            <p className="m-0 text-3xl font-bold text-foreground">{pendingCount}</p>
            <p className="m-0 text-xs text-muted-foreground">Submissions awaiting physical inspection or call</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Verified</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <p className="m-0 text-3xl font-bold text-foreground">{verifiedCount}</p>
            <p className="m-0 text-xs text-muted-foreground">Verified submissions ready for admin review</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Flagged</span>
              <Flag size={18} className="text-destructive" />
            </div>
            <p className="m-0 text-3xl font-bold text-foreground">{flaggedCount}</p>
            <p className="m-0 text-xs text-muted-foreground">Submissions with flagged discrepancy or issue</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="m-0 text-base font-semibold text-foreground">Standard Field Verification Workflow</h2>
          <ol className="m-0 mt-3 list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
            <li>Review property submission details, landlord contact phone, and geolocation coordinates.</li>
            <li>Coordinate site visit, video inspection, or proxy meeting with the owner/representative.</li>
            <li>Record detailed notes (at least 5 characters) on premises, amenities, and occupancy safety.</li>
            <li>Upload proof images, verification documents, or signed meeting minutes to the secure bucket.</li>
            <li>Mark the property as verified to enable the final Admin listing review approval gate.</li>
          </ol>
        </div>
      </div>
    </VerificationWorkspaceLayout>
  );
}
