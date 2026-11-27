import { notFound, redirect } from "next/navigation";
import { loadProfile } from "@/lib/supabase/profile";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { VerificationWorkspaceLayout } from "@/features/verification/VerificationWorkspaceLayout";
import { VerificationPropertyMap } from "@/features/verification/VerificationPropertyMap";

export const dynamic = "force-dynamic";

export default async function VerificationMapPage() {
  const { user, profile, profileError } = await loadProfile();
  if (!user) redirect("/login?next=%2Fverification%2Fmap");
  if (profileError || (profile?.role !== "verification_officer" && profile?.role !== "admin") || profile.is_suspended) notFound();

  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);
  return (
    <VerificationWorkspaceLayout userId={user.id} displayName={profile.full_name} avatarUrl={avatarUrl} title="Verification map" subtitle="Find properties awaiting a site visit.">
      <VerificationPropertyMap userId={user.id} />
    </VerificationWorkspaceLayout>
  );
}
