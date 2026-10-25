import type { Metadata } from "next";
import { RestoredFinderShell } from "@/features/map/RestoredFinderShell";

export const metadata: Metadata = {
  title: "Sign In — AbangCebu",
  description: "Sign in to your AbangCebu rental account",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string | string[]; error?: string | string[] }>;
}) {
  const { message, error } = await searchParams;
  const initialErrorMessage = error === "expired_recovery_link" || error === "invalid_recovery_link"
    ? "This password reset link is invalid or expired. Request a new link using Forgot password."
    : undefined;
  const statusMessage = message === "password_reset_success"
    ? "Your password has been reset. Sign in with your new password."
    : undefined;

  return <RestoredFinderShell initialAccountOpen initialAccountMode="sign-in" statusMessage={statusMessage} initialErrorMessage={initialErrorMessage} />;
}
