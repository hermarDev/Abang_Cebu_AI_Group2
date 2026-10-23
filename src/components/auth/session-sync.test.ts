import { describe, expect, it } from "vitest";
import { getLogoutDestination, isLogoutMessage } from "./session-sync";

describe("logout session sync", () => {
  it("accepts only signed-out messages", () => {
    expect(isLogoutMessage({ type: "SIGNED_OUT" })).toBe(true);
    expect(isLogoutMessage({ type: "SIGNED_IN" })).toBe(false);
    expect(isLogoutMessage(null)).toBe(false);
    expect(isLogoutMessage({ type: "SIGNED_OUT", redirectUrl: 4 })).toBe(false);
  });

  it("allows only safe local paths for logout redirects", () => {
    expect(getLogoutDestination({ type: "SIGNED_OUT", redirectUrl: "/goodbye" })).toBe("/goodbye");
    expect(getLogoutDestination({ type: "SIGNED_OUT", redirectUrl: "//attacker.example" })).toBe("/login?message=logged_out");
    expect(getLogoutDestination({ type: "SIGNED_OUT", redirectUrl: "https://attacker.example" })).toBe("/login?message=logged_out");
  });

  it("falls back to login when the redirect is absent", () => {
    expect(getLogoutDestination({ type: "SIGNED_OUT" })).toBe("/login?message=logged_out");
  });
});
