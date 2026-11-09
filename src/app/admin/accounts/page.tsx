import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminAccountsManager } from "@/features/admin/AdminAccountsManager";
import { AdminWorkspaceLayout } from "@/features/admin/AdminWorkspaceLayout";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage({ searchParams }: { searchParams?: Promise<{ role?: string; status?: string }> }) {
  const { role, status } = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fadmin%2Faccounts");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended,full_name").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin" || profile.is_suspended) notFound();
  return <AdminWorkspaceLayout userId={user.id} displayName={profile.full_name} title="Accounts" subtitle="Suspend or reinstate renter and landlord accounts.">
    <AdminAccountsManager userId={user.id} initialRole={role} initialStatus={status} />
  </AdminWorkspaceLayout>;
}
