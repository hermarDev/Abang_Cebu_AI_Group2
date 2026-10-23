import { isSafeRedirectUrl } from "@/types/auth";

export const LOGOUT_BROADCAST_CHANNEL = "abangcebu.auth.logout";
export const DEFAULT_LOGOUT_DESTINATION = "/login?message=logged_out";

export interface LogoutMessage {
  type: "SIGNED_OUT";
  redirectUrl?: unknown;
}

export function isLogoutMessage(value: unknown): value is LogoutMessage {
  return value !== null
    && typeof value === "object"
    && (value as { type?: unknown }).type === "SIGNED_OUT"
    && ((value as { redirectUrl?: unknown }).redirectUrl === undefined
      || typeof (value as { redirectUrl?: unknown }).redirectUrl === "string");
}

export function getLogoutDestination(message: LogoutMessage): string {
  return typeof message.redirectUrl === "string" && isSafeRedirectUrl(message.redirectUrl)
    ? message.redirectUrl
    : DEFAULT_LOGOUT_DESTINATION;
}
