import { notFound, redirect } from "next/navigation";
import { loadProfile } from "@/lib/supabase/profile";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { SupportDeskWorkspaceLayout } from "@/features/support-desk/SupportDeskWorkspaceLayout";
import { SupportDeskQueue } from "@/features/support-desk/SupportDeskQueue";

export const dynamic = "force-dynamic";

export default async function SupportDeskTicketsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const { status } = (await searchParams) ?? {};
  const { user, profile, profileError } = await loadProfile();
  if (!user) redirect("/login?next=%2Fsupport-desk%2Ftickets");

  if (
    profileError ||
    !profile ||
    (profile.role !== "customer_support" && profile.role !== "admin") ||
    profile.is_suspended
  ) {
    notFound();
  }

  const avatarUrl = await signProfileAvatar(user.id, profile.avatar_url);

  return (
    <SupportDeskWorkspaceLayout
      userId={user.id}
      displayName={profile.full_name}
      avatarUrl={avatarUrl}
      title="Customer Support Tickets"
      subtitle="Review complaints, coordinate landlord responses, and escalate issues."
    >
      <SupportDeskQueue userId={user.id} initialStatus={status} />
    </SupportDeskWorkspaceLayout>
  );
}
