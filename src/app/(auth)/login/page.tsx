import type { Metadata } from "next";
import { RestoredFinderShell } from "@/features/map/RestoredFinderShell";
import { FinderPage } from "@/features/map/FinderPage";
import { createClient } from "@/lib/supabase/server";
import { getPostLoginRedirect, isAllowedSessionRole } from "@/lib/auth/sign-in";
import { getRoleHomeRoute, isWorkspaceRole } from "@/types/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In — AbangCebu",
  description: "Sign in to your AbangCebu rental account",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string | string[]; error?: string | string[]; next?: string | string[] }>;
}) {
  const { message, error, next } = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const recoveryError = error === "expired_recovery_link" || error === "invalid_recovery_link";
  if (!authError && user && !recoveryError) {
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role, is_suspended").eq("id", user.id).maybeSingle();
    const role = !profileError && !profile?.is_suspended && isAllowedSessionRole(profile?.role) ? profile.role : undefined;
    const destination = getPostLoginRedirect(typeof next === "string" ? next : null, role);
    redirect(new URL(destination, "http://localhost").pathname === "/login" ? getRoleHomeRoute(role) : destination);
  }
  const initialErrorMessage = recoveryError
    ? "This password reset link is invalid or expired. Request a new link using Forgot password."
    : undefined;
  const statusMessage = message === "password_reset_success"
    ? "Your password has been reset. Sign in with your new password."
    : undefined;

  if (!authError && user && initialErrorMessage) {
    const { data: profile } = await supabase.from("profiles").select("role, is_suspended").eq("id", user.id).maybeSingle();
    if (!profile?.is_suspended && isWorkspaceRole(profile?.role)) {
      return <main className="mx-auto max-w-lg p-6"><div role="alert">This password reset link is invalid or expired. Manage your password in account settings.</div><Link className="inline-flex min-h-11 items-center underline" href="/account">Account settings</Link><br /><Link className="inline-flex min-h-11 items-center underline" href={getRoleHomeRoute(profile.role)}>Back to workspace</Link></main>;
    }
    return FinderPage({ verifiedSession: { user, supabase }, initialErrorMessage: "This password reset link is invalid or expired. Manage your password in account settings." });
  }
  return <RestoredFinderShell initialAccountOpen initialAccountMode="sign-in" statusMessage={statusMessage} initialErrorMessage={initialErrorMessage} />;
}
