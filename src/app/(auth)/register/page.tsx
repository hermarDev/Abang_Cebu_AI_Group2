import type { Metadata } from "next";
import { RestoredFinderShell } from "@/features/map/RestoredFinderShell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Register — AbangCebu",
  description: "Create an account on AbangCebu to discover or list rentals",
};

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) redirect("/");
  return <RestoredFinderShell initialAccountOpen initialAccountMode="sign-up" />;
}
