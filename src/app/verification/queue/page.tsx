import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { VerificationWorkspaceLayout } from "@/features/verification/VerificationWorkspaceLayout";
import { VerificationQueue } from "@/features/verification/VerificationQueue";
import { isUuid } from "@/server/verification-access";

export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  propertyId?: string;
  search?: string;
}

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login?next=%2Fverification%2Fqueue");

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

  const validStatuses = ["pending_verification", "verified", "flagged", "all"] as const;
  const initialStatus = validStatuses.includes(resolvedParams.status as typeof validStatuses[number])
    ? (resolvedParams.status as typeof validStatuses[number])
    : "pending_verification";

  const initialPropertyId = isUuid(resolvedParams.propertyId) ? resolvedParams.propertyId : undefined;

  return (
    <VerificationWorkspaceLayout
      userId={user.id}
      displayName={profile.full_name}
      avatarUrl={avatarUrl}
      title="Verification Queue"
      subtitle="Inspect landlord listings, review submitted property coordinates and log verification decisions."
    >
      <VerificationQueue
        userId={user.id}
        initialStatus={initialStatus}
        initialPropertyId={initialPropertyId}
        initialSearch={resolvedParams.search}
      />
    </VerificationWorkspaceLayout>
  );
}
