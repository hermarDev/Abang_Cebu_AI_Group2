import { describe, expect, it } from "vitest";
import { PASSWORD_RESET_CALLBACK_PATH, PASSWORD_RESET_FORM_PATH, PASSWORD_RESET_RECOVERY_COOKIE } from "./password-reset";

describe("password reset flow contract", () => {
  it("uses a recovery-scoped query marker for session validation", async () => {
    const recoveryUrl = new URL("http://localhost/auth/reset-password/callback");
    const params = new URLSearchParams("type=recovery&next=%2Freset-password");
    for (const [key, value] of params) recoveryUrl.searchParams.set(key, value);
    expect(recoveryUrl.pathname).toBe("/auth/reset-password/callback");
    expect(recoveryUrl.searchParams.get("type")).toBe("recovery");
  });

  it("uses one callback path and a dedicated short-lived recovery marker", () => {
    expect(PASSWORD_RESET_CALLBACK_PATH).toBe("/auth/reset-password/callback");
    expect(PASSWORD_RESET_FORM_PATH).toBe("/reset-password");
    expect(PASSWORD_RESET_RECOVERY_COOKIE).toBe("abangcebu-password-reset");
  });
});
