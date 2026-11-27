import { notFound, redirect } from "next/navigation";
import { loadProfile } from "@/lib/supabase/profile";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { AdminSupportQueue } from "@/features/admin/AdminSupportQueue";
import { AdminWorkspaceLayout } from "@/features/admin/AdminWorkspaceLayout";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; ticket?: string }>;
}) {
  const { status, ticket } = (await searchParams) ?? {};
  const { user, profile, profileError } = await loadProfile();
  if (!user) redirect("/login?next=%2Fadmin%2Fsupport");
  if (profileError || profile?.role !== "admin" || profile.is_suspended) notFound();

  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);
  return (
    <AdminWorkspaceLayout
      userId={user.id}
      displayName={profile.full_name}
      avatarUrl={avatarUrl}
      title="Support tickets"
      subtitle="Review user support requests, update ticket status, and send replies."
    >
      <AdminSupportQueue userId={user.id} initialStatus={status} initialTicketId={ticket} />
    </AdminWorkspaceLayout>
  );
}
