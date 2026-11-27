import { notFound, redirect } from "next/navigation";
import { loadProfile } from "@/lib/supabase/profile";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { AdminReportsQueue } from "@/features/admin/AdminReportsQueue";
import { AdminWorkspaceLayout } from "@/features/admin/AdminWorkspaceLayout";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const { status } = (await searchParams) ?? {};
  const { user, profile, profileError } = await loadProfile();
  if (!user) redirect("/login?next=%2Fadmin%2Freports");
  if (profileError || profile?.role !== "admin" || profile.is_suspended) notFound();
  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);
  return <AdminWorkspaceLayout userId={user.id} displayName={profile.full_name} avatarUrl={avatarUrl} title="Reports" subtitle="Review abuse reports and record moderation decisions.">
    <AdminReportsQueue userId={user.id} initialStatus={status} />
  </AdminWorkspaceLayout>;
}
