import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { AdminReportsQueue } from "@/features/admin/AdminReportsQueue";
import { AdminWorkspaceLayout } from "@/features/admin/AdminWorkspaceLayout";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const { status } = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fadmin%2Freports");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended,full_name,avatar_url").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin" || profile.is_suspended) notFound();
  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);
  return <AdminWorkspaceLayout userId={user.id} displayName={profile.full_name} avatarUrl={avatarUrl} title="Reports" subtitle="Review abuse reports and record moderation decisions.">
    <AdminReportsQueue userId={user.id} initialStatus={status} />
  </AdminWorkspaceLayout>;
}
