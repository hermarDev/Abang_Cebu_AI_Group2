import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HelpCenterClient } from "@/features/support/HelpCenterClient";
import { LandlordMobileNav } from "@/features/landlord/LandlordMobileNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Help Center — AbangCebu",
  description: "Find answers to common questions about Cebu rentals, landlord publishing, account security, and policies.",
};

export default async function HelpPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole: string | null = null;
  let isSuspended = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", user.id)
      .maybeSingle();

    userRole = profile?.role ?? null;
    isSuspended = Boolean(profile?.is_suspended);
  }

  const backHref =
    !isSuspended && userRole === "admin"
      ? "/admin/dashboard"
      : !isSuspended && userRole === "landlord"
        ? "/landlord/dashboard"
        : "/";

  const backLabel =
    !isSuspended && userRole === "admin"
      ? "Back to admin workspace"
      : !isSuspended && userRole === "landlord"
        ? "Back to workspace"
        : "Back to map";

  const isLandlordMobile = userRole === "landlord" && !isSuspended;

  return (
    <>
      <HelpCenterClient
        backHref={backHref}
        backLabel={backLabel}
        userRole={userRole}
        isLandlordMobile={isLandlordMobile}
      />
      {isLandlordMobile && user && <LandlordMobileNav userId={user.id} />}
    </>
  );
}
