import { RestoredFinderShell } from "@/features/map/RestoredFinderShell";

import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const authenticated = !error && Boolean(user);
  let displayName: string | null = null;
  let avatarUrl: string | null = null;

  if (authenticated && user) {
    const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();
    const metadataName = [user.user_metadata.full_name, user.user_metadata.name].find((value): value is string => typeof value === "string" && Boolean(value.trim()));
    displayName = profile?.full_name?.trim() || (typeof metadataName === "string" ? metadataName.trim() : null) || user.email?.split("@")[0] || null;
    avatarUrl = await signProfileAvatar(user.id, profile?.avatar_url);
  }

  return <RestoredFinderShell authenticated={authenticated} userId={authenticated ? user?.id ?? null : null} displayName={displayName} avatarUrl={avatarUrl} />;
}
