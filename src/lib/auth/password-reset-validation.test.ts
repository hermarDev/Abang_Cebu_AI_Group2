import { describe, expect, it } from "vitest";
import { validateResetConfirmation, validateResetRequest } from "./password-reset-validation";

describe("password reset request validation", () => {
  it("normalizes a valid email", () => {
    expect(validateResetRequest({ email: " Person@Example.com " })).toEqual({ ok: true, email: "person@example.com" });
  });
  it.each([null, [], "email", { email: "bad" }, { email: "a@b.com", turnstileToken: 3 }])("rejects invalid request payload %#", (value) => {
    expect(validateResetRequest(value).ok).toBe(false);
  });
});

describe("password reset confirmation validation", () => {
  it("accepts matching strong passwords", () => {
    expect(validateResetConfirmation({ newPassword: "NewStrong1!", confirmPassword: "NewStrong1!" })).toEqual({ ok: true, newPassword: "NewStrong1!" });
  });
  it("rejects non-object, missing and mismatched payloads", () => {
    expect(validateResetConfirmation(null)).toEqual({ ok: false, code: "VALIDATION_ERROR" });
    expect(validateResetConfirmation({ newPassword: "NewStrong1!" })).toEqual({ ok: false, code: "VALIDATION_ERROR" });
    expect(validateResetConfirmation({ newPassword: "NewStrong1!", confirmPassword: "Different1!" })).toEqual({ ok: false, code: "VALIDATION_ERROR" });
  });
  it.each(["weak", "A".repeat(73), "abcdefgh1"]) ("rejects weak password %s", (password) => {
    expect(validateResetConfirmation({ newPassword: password, confirmPassword: password })).toEqual({ ok: false, code: "WEAK_PASSWORD" });
  });
});
