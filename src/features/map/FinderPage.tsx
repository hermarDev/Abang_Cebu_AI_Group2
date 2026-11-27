import { redirect } from "next/navigation";
import { RestoredFinderShell } from "@/features/map/RestoredFinderShell";
import { loadProfile } from "@/lib/supabase/profile";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { getRoleHomeRoute, isWorkspaceRole } from "@/types/auth";
import type { UserRole } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export async function FinderPage({ initialErrorMessage, verifiedSession }: { initialErrorMessage?: string; verifiedSession?: { user: User; supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>> } } = {}) {
  const { user, profile } = verifiedSession
    ? await (async () => {
        const { data } = await verifiedSession.supabase
          .from("profiles")
          .select("id, role, full_name, phone_number, avatar_url, is_suspended")
          .eq("id", verifiedSession.user.id)
          .maybeSingle();
        return { user: verifiedSession.user, profile: data };
      })()
    : await loadProfile();
  const authenticated = Boolean(user);
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  let userRole: UserRole | null = null;

  if (authenticated && user) {
    if (!initialErrorMessage && !profile?.is_suspended && isWorkspaceRole(profile?.role)) redirect(getRoleHomeRoute(profile.role));

    const metadataName = [user.user_metadata.full_name, user.user_metadata.name].find((value): value is string => typeof value === "string" && Boolean(value.trim()));
    displayName = profile?.full_name?.trim() || (typeof metadataName === "string" ? metadataName.trim() : null) || user.email?.split("@")[0] || null;
    avatarUrl = await signProfileAvatar(user.id, profile?.avatar_url);
    if (profile?.role === "renter" || profile?.role === "landlord" || profile?.role === "admin" || profile?.role === "verification_officer" || profile?.role === "customer_support") userRole = profile.role;
  }

  return <RestoredFinderShell authenticated={authenticated} userRole={userRole} userId={authenticated ? user?.id ?? null : null} displayName={displayName} avatarUrl={avatarUrl} initialAccountOpen={Boolean(initialErrorMessage)} initialErrorMessage={initialErrorMessage} />;
}