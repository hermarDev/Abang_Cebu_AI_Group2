import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { MapPinned } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/supabase/profile";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { fetchLandlordPortfolio } from "@/server/landlord-properties";
import { LandlordWorkspaceLayout } from "../dashboard/LandlordWorkspaceLayout";
import { LandlordPropertiesClient } from "./LandlordPropertiesClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My Properties — AbangCebu Landlord",
  description: "Manage your rental listings, pending submissions, and drafts.",
};

export default async function LandlordPropertiesPage() {
  const { user, profile, authError, profileError } = await loadProfile();
  // A transient network failure is not a missing session; redirecting would bounce /login <-> here.
  if (authError && isAuthRetryableFetchError(authError)) return <main><p role="alert">Your account could not be checked. Please refresh the page to try again.</p></main>;
  if (authError || !user) redirect("/login?next=%2Flandlord%2Fproperties");

  if (profileError || profile?.role !== "landlord" || profile.is_suspended) notFound();

  const supabase = await createClient();
  const [avatarUrl, portfolio] = await Promise.all([
    signProfileAvatar(user.id, profile.avatar_url),
    fetchLandlordPortfolio(supabase, user.id),
  ]);

  const displayName = profile.full_name?.trim() || "landlord";
  const hasCoreError = portfolio.errors.listings || portfolio.errors.properties || portfolio.errors.drafts;
  const propertiesCount = hasCoreError ? null : portfolio.items.length;

  return (
    <LandlordWorkspaceLayout
      userId={user.id}
      displayName={displayName}
      avatarUrl={avatarUrl}
      propertiesCount={propertiesCount}
      brand={
        <Link href="/landlord/dashboard" aria-label="AbangCebu landlord workspace" className="flex min-w-0 items-center gap-3">
          <BrandLogo className="h-auto w-24 sm:w-32" />
          <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">Landlord workspace</span>
        </Link>
      }
      actions={
        <Link
          href="/landlord/map"
          aria-label="Open property map"
          className="hidden lg:inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <MapPinned size={17} aria-hidden="true" />
          <span>Property map</span>
        </Link>
      }
    >
      <LandlordPropertiesClient
        properties={portfolio.items}
        errors={portfolio.errors}
        truncated={portfolio.truncated}
      />
    </LandlordWorkspaceLayout>
  );
}
