import type { Metadata } from "next";
import { loadProfile } from "@/lib/supabase/profile";
import { HelpCenterClient } from "@/features/support/HelpCenterClient";
import { LandlordMobileNav } from "@/features/landlord/LandlordMobileNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Help Center — AbangCebu",
  description: "Find answers to common questions about Cebu rentals, landlord publishing, account security, and policies.",
};

export default async function HelpPage() {
  const { user, profile } = await loadProfile();

  const userRole: string | null = profile?.role ?? null;
  const isSuspended = Boolean(profile?.is_suspended);

  const backHref =
    !isSuspended && userRole === "admin"
      ? "/admin/dashboard"
      : !isSuspended && userRole === "landlord"
        ? "/landlord/dashboard"
        : !isSuspended && userRole === "verification_officer"
          ? "/verification/dashboard"
          : !isSuspended && userRole === "customer_support"
            ? "/support-desk/dashboard"
            : "/";

  const backLabel =
    !isSuspended && userRole === "admin"
      ? "Back to admin workspace"
      : !isSuspended && userRole === "landlord"
        ? "Back to workspace"
        : !isSuspended && userRole === "verification_officer"
          ? "Back to verification workspace"
          : !isSuspended && userRole === "customer_support"
            ? "Back to support workspace"
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
