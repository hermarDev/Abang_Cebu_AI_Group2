import { notFound, redirect } from "next/navigation";
import { loadProfile } from "@/lib/supabase/profile";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { AdminAuditLog } from "@/features/admin/AdminAuditLog";
import { AdminWorkspaceLayout } from "@/features/admin/AdminWorkspaceLayout";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const { user, profile, profileError } = await loadProfile();
  if (!user) redirect("/login?next=%2Fadmin%2Faudit");
  if (profileError || profile?.role !== "admin" || profile.is_suspended) notFound();
  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);
  return <AdminWorkspaceLayout userId={user.id} displayName={profile.full_name} avatarUrl={avatarUrl} title="Audit log" subtitle="Every moderation action, newest first.">
    <AdminAuditLog userId={user.id} />
  </AdminWorkspaceLayout>;
}
