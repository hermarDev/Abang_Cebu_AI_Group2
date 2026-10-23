import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { PASSWORD_RESET_RECOVERY_COOKIE } from "@/lib/auth/password-reset";

export const metadata: Metadata = {
  title: "Reset Password — AbangCebu",
  description: "Reset your AbangCebu account password",
};

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const isRecovery = cookieStore.get(PASSWORD_RESET_RECOVERY_COOKIE)?.value === "1";

  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center bg-[#f4f8fc] px-4 py-10">
      <Link href="/" className="mx-auto mb-6 inline-flex items-center gap-2 rounded-lg p-2 text-sm font-semibold text-[#23445c] hover:bg-[#eaf2fb]" aria-label="Return to AbangCebu home">
        <Image src="/icons/main_Logo.png" alt="" width={138} height={40} priority className="h-auto w-[8.625rem]" />
      </Link>
      <ResetPasswordForm isRecovery={isRecovery} />
    </main>
  );
}
