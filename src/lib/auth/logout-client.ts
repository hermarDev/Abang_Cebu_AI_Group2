import {
  DEFAULT_LOGOUT_DESTINATION,
  LOGOUT_BROADCAST_CHANNEL,
  type LogoutMessage,
} from "@/components/auth/session-sync";

interface LogoutResponse {
  ok: boolean;
  json(): Promise<unknown>;
}

type LogoutFetcher = (input: string, init: RequestInit) => Promise<LogoutResponse>;
type LogoutAnnouncer = (message: LogoutMessage) => void;

export async function logoutFromCurrentTab(
  fetcher: LogoutFetcher = (input, init) => fetch(input, init),
  announce: LogoutAnnouncer = (message) => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(LOGOUT_BROADCAST_CHANNEL);
    channel.postMessage(message);
    channel.close();
  },
): Promise<boolean> {
  const response = await fetcher("/api/logout", { method: "POST" });
  if (!response.ok) return false;

  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || !("success" in payload) || payload.success !== true) {
    return false;
  }

  announce({ type: "SIGNED_OUT", redirectUrl: DEFAULT_LOGOUT_DESTINATION });
  return true;
}
