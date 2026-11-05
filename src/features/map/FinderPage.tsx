import { redirect } from "next/navigation";
import { RestoredFinderShell } from "@/features/map/RestoredFinderShell";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import type { UserRole } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export async function FinderPage({ initialErrorMessage, verifiedSession }: { initialErrorMessage?: string; verifiedSession?: { user: User; supabase: Awaited<ReturnType<typeof createClient>> } } = {}) {
  const supabase = verifiedSession?.supabase ?? await createClient();
  const { data: { user }, error } = verifiedSession ? { data: { user: verifiedSession.user }, error: null } : await supabase.auth.getUser();
  const authenticated = !error && Boolean(user);
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  let userRole: UserRole | null = null;

  if (authenticated && user) {
    const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url, role, is_suspended").eq("id", user.id).maybeSingle();
    if (!initialErrorMessage && profile?.role === "landlord" && !profile.is_suspended) redirect("/landlord/dashboard");

    const metadataName = [user.user_metadata.full_name, user.user_metadata.name].find((value): value is string => typeof value === "string" && Boolean(value.trim()));
    displayName = profile?.full_name?.trim() || (typeof metadataName === "string" ? metadataName.trim() : null) || user.email?.split("@")[0] || null;
    avatarUrl = await signProfileAvatar(user.id, profile?.avatar_url);
    if (profile?.role === "renter" || profile?.role === "landlord" || profile?.role === "admin") userRole = profile.role;
  }

  return <RestoredFinderShell authenticated={authenticated} userRole={userRole} userId={authenticated ? user?.id ?? null : null} displayName={displayName} avatarUrl={avatarUrl} initialAccountOpen={Boolean(initialErrorMessage)} initialErrorMessage={initialErrorMessage} />;
}