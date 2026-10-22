"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SESSION_CONSTANTS } from "@/types/auth";

const DEFAULT_LOGOUT_REDIRECT = "/";
const SIGNED_OUT = "SIGNED_OUT" as const;
type SignOutMessage = { type: typeof SIGNED_OUT; timestamp: number; redirectUrl?: string };

function safeRedirect(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 32 || code === 127) return DEFAULT_LOGOUT_REDIRECT;
  }
  if (/%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) return DEFAULT_LOGOUT_REDIRECT;
  return value;
}

export default function SessionSync() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(SESSION_CONSTANTS.BROADCAST_CHANNEL_NAME);
    let handled = 0;
    channel.onmessage = (event: MessageEvent<SignOutMessage>) => {
      const message = event.data;
      if (
        !message || message.type !== SIGNED_OUT || !Number.isFinite(message.timestamp) ||
        message.timestamp <= handled || message.timestamp > Date.now() + 30_000
      ) return;
      handled = message.timestamp;
      router.refresh();
      if (pathname !== "/login") router.replace(safeRedirect(message.redirectUrl));
    };
    return () => channel.close();
  }, [pathname, router]);

  return null;
}

export { safeRedirect };
