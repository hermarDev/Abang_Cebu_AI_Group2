import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { VerificationWorkspaceLayout } from "@/features/verification/VerificationWorkspaceLayout";
import { VerificationQueue } from "@/features/verification/VerificationQueue";

export const dynamic = "force-dynamic";

export default async function VerificationQueuePage() {
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

  return (
    <VerificationWorkspaceLayout
      userId={user.id}
      displayName={profile.full_name}
      avatarUrl={avatarUrl}
      title="Verification Queue"
      subtitle="Inspect landlord listings, review submitted property coordinates and log verification decisions."
    >
      <VerificationQueue userId={user.id} />
    </VerificationWorkspaceLayout>
  );
}
