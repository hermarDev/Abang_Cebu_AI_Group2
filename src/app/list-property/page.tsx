import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListPropertyForm } from "./ListPropertyForm";

export const metadata: Metadata = { title: "List your property — AbangCebu" };

export default async function ListPropertyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Flist-property");
  const { data: profile, error } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (error || profile?.role !== "landlord" || profile.is_suspended) notFound();
  const params = await searchParams;
  const draftIdParam = Array.isArray(params.draftId) ? params.draftId[0] : params.draftId;
  const revisionParam = Array.isArray(params.revision) ? params.revision[0] : params.revision;
  const restoreTarget = typeof draftIdParam === "string" && draftIdParam && typeof revisionParam === "string" && revisionParam
    ? { draftId: draftIdParam, revision: revisionParam }
    : null;

  return <main className="min-h-[100dvh] bg-background px-4 pt-5 pb-[calc(1rem+env(safe-area-inset-bottom))] text-foreground">
    <div className="mx-auto grid max-w-5xl gap-4">
      <Link href="/landlord/dashboard" aria-label="Back to dashboard" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 text-sm font-semibold text-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ArrowLeft size={17} aria-hidden="true" /> Back to dashboard</Link>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-action">Landlord workspace</p>
        <h1 className="mb-0 mt-2 text-3xl font-bold">List your property</h1>
        <p role="status" className="mb-0 mt-3 text-sm">Save a draft at any step, then submit your listing for review when it is ready.</p>
      </section>
      <ListPropertyForm userId={user.id} restoreTarget={restoreTarget} />
    </div>
  </main>;
}