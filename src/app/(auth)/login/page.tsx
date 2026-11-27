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
  const recoveryUnavailable = error === "password_reset_unavailable";
  const recoveryError = error === "expired_recovery_link" || error === "invalid_recovery_link" || recoveryUnavailable;
  if (!authError && user && !recoveryError) {
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role, is_suspended").eq("id", user.id).maybeSingle();
    const role = !profileError && !profile?.is_suspended && isAllowedSessionRole(profile?.role) ? profile.role : undefined;
    const destination = getPostLoginRedirect(typeof next === "string" ? next : null, role);
    redirect(new URL(destination, "http://localhost").pathname === "/login" ? getRoleHomeRoute(role) : destination);
  }
  const initialErrorMessage = recoveryUnavailable
    ? "We couldn't verify this reset link because the service is temporarily unavailable. You can request a new link below."
    : recoveryError
      ? "This password reset link is invalid or expired. Request a new link using Forgot password."
      : undefined;
  const statusMessage = message === "password_reset_success"
    ? "Your password has been reset. Sign in with your new password."
    : undefined;

  if (!authError && user && initialErrorMessage) {
    const { data: profile } = await supabase.from("profiles").select("role, is_suspended").eq("id", user.id).maybeSingle();
    const signedInErrorMessage = recoveryUnavailable
      ? "Password recovery is temporarily unavailable. Try again later or manage your password in account settings."
      : "This password reset link is invalid or expired. Manage your password in account settings.";
    if (!profile?.is_suspended && isWorkspaceRole(profile?.role)) {
      return <main className="mx-auto max-w-lg p-6"><div role="alert">{signedInErrorMessage}</div><Link className="inline-flex min-h-11 items-center underline" href="/account">Account settings</Link><br /><Link className="inline-flex min-h-11 items-center underline" href={getRoleHomeRoute(profile.role)}>Back to workspace</Link></main>;
    }
    return FinderPage({ verifiedSession: { user, supabase }, initialErrorMessage: signedInErrorMessage });
  }
  return <RestoredFinderShell initialAccountOpen initialAccountMode="sign-in" statusMessage={statusMessage} initialErrorMessage={initialErrorMessage} />;
}
