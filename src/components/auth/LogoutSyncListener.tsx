"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getLogoutDestination,
  isLogoutMessage,
  LOGOUT_BROADCAST_CHANNEL,
} from "./session-sync";

export function LogoutSyncListener() {
  const router = useRouter();

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(LOGOUT_BROADCAST_CHANNEL);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (isLogoutMessage(event.data)) {
        router.replace(getLogoutDestination(event.data));
        router.refresh();
      }
    };

    return () => channel.close();
  }, [router]);

  return null;
}
