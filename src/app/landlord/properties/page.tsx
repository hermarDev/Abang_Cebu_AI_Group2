import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { MapPinned } from "lucide-react";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { fetchLandlordManagedProperties } from "@/server/landlord-properties";
import { LandlordWorkspaceLayout } from "../dashboard/LandlordWorkspaceLayout";
import { LandlordPropertiesClient } from "./LandlordPropertiesClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My Properties — AbangCebu Landlord",
  description: "Manage your rental listings, pending submissions, and drafts.",
};

export default async function LandlordPropertiesPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  // A transient network failure is not a missing session; redirecting would bounce /login <-> here.
  if (authError && isAuthRetryableFetchError(authError)) return <main><p role="alert">Your account could not be checked. Please refresh the page to try again.</p></main>;
  if (authError || !user) redirect("/login?next=%2Flandlord%2Fproperties");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name,avatar_url,role,is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "landlord" || profile.is_suspended) notFound();

  const [avatarUrl, properties] = await Promise.all([
    signProfileAvatar(user.id, profile.avatar_url),
    fetchLandlordManagedProperties(supabase, user.id),
  ]);

  const displayName = profile.full_name?.trim() || "landlord";

  return (
    <LandlordWorkspaceLayout
      userId={user.id}
      propertiesCount={properties.length}
      brand={
        <Link href="/landlord/dashboard" aria-label="AbangCebu landlord workspace" className="flex min-w-0 items-center gap-3">
          <Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} unoptimized className="h-auto w-24 dark:hidden sm:w-32" loading="eager" />
          <Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} unoptimized className="hidden h-auto w-24 dark:block sm:w-32" loading="eager" />
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
      <LandlordPropertiesClient properties={properties} />
    </LandlordWorkspaceLayout>
  );
}
