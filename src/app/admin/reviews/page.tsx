import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminReviewQueue } from "@/features/admin/AdminReviewQueue";
import { AdminWorkspaceLayout } from "@/features/admin/AdminWorkspaceLayout";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const { status } = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fadmin%2Freviews");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended,full_name").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin" || profile.is_suspended) notFound();
  return <AdminWorkspaceLayout userId={user.id} displayName={profile.full_name} title="Listing reviews" subtitle="Approve, reject, unpublish, or restore property listings.">
    <AdminReviewQueue userId={user.id} initialStatus={status} />
  </AdminWorkspaceLayout>;
}
