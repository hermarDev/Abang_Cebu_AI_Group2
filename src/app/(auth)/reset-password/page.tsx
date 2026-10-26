import type { Metadata } from "next";
import { cookies } from "next/headers";
import { RestoredFinderShell } from "@/features/map/RestoredFinderShell";
import { PASSWORD_RESET_RECOVERY_COOKIE } from "@/lib/auth/password-reset";

export const metadata: Metadata = {
  title: "Reset Password — AbangCebu",
  description: "Reset your AbangCebu account password",
};

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const isRecovery = cookieStore.get(PASSWORD_RESET_RECOVERY_COOKIE)?.value === "1";

  return <RestoredFinderShell
    initialAccountOpen
    initialAccountMode="reset"
    isRecovery={isRecovery}
  />;
}
