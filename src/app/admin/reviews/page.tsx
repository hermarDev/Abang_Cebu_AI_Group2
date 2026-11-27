import { notFound, redirect } from "next/navigation";
import { loadProfile } from "@/lib/supabase/profile";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { AdminReviewQueue } from "@/features/admin/AdminReviewQueue";
import { AdminWorkspaceLayout } from "@/features/admin/AdminWorkspaceLayout";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({ searchParams }: { searchParams?: Promise<{ status?: string; search?: string }> }) {
  const { status, search } = (await searchParams) ?? {};
  const { user, profile, profileError } = await loadProfile();
  if (!user) redirect("/login?next=%2Fadmin%2Freviews");
  if (profileError || profile?.role !== "admin" || profile.is_suspended) notFound();
  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);
  return <AdminWorkspaceLayout userId={user.id} displayName={profile.full_name} avatarUrl={avatarUrl} title="Listing reviews" subtitle="Approve, reject, unpublish, or restore property listings.">
    <AdminReviewQueue userId={user.id} initialStatus={status} initialSearch={search} />
  </AdminWorkspaceLayout>;
}
