"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LOGOUT_BROADCAST_CHANNEL } from "@/components/auth/session-sync";
import { logoutFromCurrentTab } from "@/lib/auth/logout-client";

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setError(null);
    setLoading(true);
    try {
      const completed = await logoutFromCurrentTab(undefined, (message) => {
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel(LOGOUT_BROADCAST_CHANNEL);
          channel.postMessage(message);
          channel.close();
        }
      });
      if (!completed) {
        setError("Unable to sign out. Please try again.");
        return;
      }
      router.replace("/login?message=logged_out");
      router.refresh();
    } catch {
      setError("Unable to sign out because the request failed. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg" aria-labelledby="logout-title">
        <h1 id="logout-title" className="text-xl font-semibold">Sign out of AbangCebu?</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your current session will be closed on this device.</p>
        {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
          <Button onClick={handleLogout} disabled={loading}>{loading ? "Signing out…" : "Sign out"}</Button>
        </div>
      </section>
    </main>
  );
}
