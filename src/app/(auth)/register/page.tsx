import type { Metadata } from "next";
import { RestoredFinderShell } from "@/features/map/RestoredFinderShell";
import { loadProfile } from "@/lib/supabase/profile";
import { redirect } from "next/navigation";
import { getRoleHomeRoute } from "@/types/auth";

export const metadata: Metadata = {
  title: "Register — AbangCebu",
  description: "Create an account on AbangCebu to discover or list rentals",
};

export default async function RegisterPage() {
  const { user, profile, profileError } = await loadProfile();
  if (user) {
    redirect(!profileError && !profile?.is_suspended ? getRoleHomeRoute(profile?.role) : "/");
  }
  return <RestoredFinderShell initialAccountOpen initialAccountMode="sign-up" />;
}
