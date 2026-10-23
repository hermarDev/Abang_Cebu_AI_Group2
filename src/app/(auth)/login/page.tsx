import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — AbangCebu",
  description: "Sign in to your AbangCebu rental account",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string | string[] }>;
}) {
  const message = (await searchParams).message;
  const statusMessage = message === "password_reset_success"
    ? "Your password has been reset. Sign in with your new password."
    : undefined;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <LoginForm statusMessage={statusMessage} />
    </div>
  );
}
