import type { Metadata } from "next";
import { RestoredFinderShell } from "@/features/map/RestoredFinderShell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRoleHomeRoute } from "@/types/auth";

export const metadata: Metadata = {
  title: "Register — AbangCebu",
  description: "Create an account on AbangCebu to discover or list rentals",
};

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) {
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role, is_suspended").eq("id", user.id).maybeSingle();
    redirect(!profileError && !profile?.is_suspended ? getRoleHomeRoute(profile?.role) : "/");
  }
  return <RestoredFinderShell initialAccountOpen initialAccountMode="sign-up" />;
}
