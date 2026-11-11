import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { ArrowLeft, MapPinned } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { LandlordWorkspaceLayout } from "@/app/landlord/dashboard/LandlordWorkspaceLayout";
import { ListPropertyForm } from "./ListPropertyForm";

export const metadata: Metadata = { title: "List your property — AbangCebu" };

export default async function ListPropertyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && isAuthRetryableFetchError(authError)) return <main><p role="alert">Your account could not be checked. Please refresh the page to try again.</p></main>;
  if (authError || !user) redirect("/login?next=%2Flist-property");
  const { data: profile, error } = await supabase.from("profiles").select("full_name,avatar_url,role,is_suspended").eq("id", user.id).maybeSingle();
  if (error || profile?.role !== "landlord" || profile.is_suspended) notFound();
  const [params, avatarUrl] = await Promise.all([searchParams, signProfileAvatar(user.id, profile.avatar_url)]);
  const displayName = profile.full_name?.trim() || "landlord";
  const draftIdParam = Array.isArray(params.draftId) ? params.draftId[0] : params.draftId;
  const revisionParam = Array.isArray(params.revision) ? params.revision[0] : params.revision;
  const lockedLocationParam = Array.isArray(params.lockedLocation) ? params.lockedLocation[0] : params.lockedLocation;
  const restoreTarget = typeof draftIdParam === "string" && draftIdParam && typeof revisionParam === "string" && revisionParam
    ? { draftId: draftIdParam, revision: revisionParam, ...(lockedLocationParam === "1" ? { lockedLocation: true } : {}) }
    : null;

  return (
    <LandlordWorkspaceLayout
      userId={user.id}
      brand={
        <Link href="/landlord/dashboard" aria-label="AbangCebu landlord workspace" className="flex min-w-0 items-center gap-3">
          <BrandLogo className="h-auto w-24 sm:w-32" />
          <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">Landlord workspace</span>
        </Link>
      }
      actions={
        <>
          <Link
            href="/landlord/map"
            aria-label="Open property map"
            className="hidden lg:inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <MapPinned size={17} aria-hidden="true" />
            <span>Property map</span>
          </Link>
          <AccountMenu displayName={displayName} avatarUrl={avatarUrl} role="Landlord" variant="header" />
        </>
      }
    >
      <div className="mx-auto grid w-full max-w-4xl gap-4">
        <Link href="/landlord/properties" aria-label="Back to My properties" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 text-sm font-semibold text-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ArrowLeft size={17} aria-hidden="true" /> Back to My properties</Link>
        <section className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <h1 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">List your property</h1>
          <p role="status" className="mb-0 mt-1.5 text-sm text-muted-foreground">Save a draft at any step, then submit your listing for review when it is ready.</p>
        </section>
        <ListPropertyForm userId={user.id} restoreTarget={restoreTarget} />
      </div>
    </LandlordWorkspaceLayout>
  );
}
