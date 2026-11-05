import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fadmin%2Fdashboard");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin" || profile.is_suspended) notFound();

  return <main className="min-h-[100dvh] bg-background px-4 py-8 text-foreground">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-action underline">Back to map</Link>
      <header className="mt-6">
        <p className="text-sm font-semibold text-action">AbangCebu · Administration</p>
        <h1 className="mt-2 text-3xl font-bold">Admin dashboard</h1>
        <p className="mt-2 text-muted-foreground">Review and moderation tools will appear here as they become available.</p>
      </header>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">Property submissions</h2><p className="mt-2 text-sm text-muted-foreground">Listing review is not available yet.</p></section>
        <section className="rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">Identity verification</h2><p className="mt-2 text-sm text-muted-foreground">Identity review is not available yet.</p></section>
      </div>
      <Link href="/account" className="mt-8 inline-flex min-h-11 items-center text-action underline">Account settings</Link>
    </div>
  </main>;
}
