"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SESSION_CONSTANTS } from "@/types/auth";

export default function LogoutForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setPending(true);
    setError("");
    let channel: BroadcastChannel | undefined;
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "local", redirectUrl: SESSION_CONSTANTS.DEFAULT_LOGOUT_REDIRECT }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => null) as {
        success?: boolean;
        data?: { redirectUrl?: string };
      } | null;
      if (response.headers.get("x-session-cookies-cleared") !== "true") {
        setError("Could not clear this session. Please retry.");
        return;
      }
      try {
        channel = new BroadcastChannel(SESSION_CONSTANTS.BROADCAST_CHANNEL_NAME);
        channel.postMessage({
          type: "SIGNED_OUT",
          timestamp: Date.now(),
          redirectUrl: result?.data?.redirectUrl ?? SESSION_CONSTANTS.DEFAULT_LOGOUT_REDIRECT,
        });
      } catch {
        // Local logout still proceeds when BroadcastChannel is unavailable.
      }
      router.refresh();
      router.replace(SESSION_CONSTANTS.DEFAULT_LOGOUT_REDIRECT);
      if (!response.ok || !result?.success) {
        setError("This device was signed out, but server revocation could not be confirmed.");
      }
    } catch {
      setError("Could not reach the sign-out service. Please retry while online.");
    } finally {
      channel?.close();
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Sign out</h1>
      <p>Sign out of this device?</p>
      <button
        className="rounded-md bg-slate-900 px-5 py-3 text-white disabled:opacity-50"
        disabled={pending}
        onClick={submit}
        type="button"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <Link className="underline" href="/">Return home</Link>
    </main>
  );
}
