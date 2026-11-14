import { describe, expect, it } from "vitest";
import { validateRegistration } from "./validation";
import { isRegisterableRole } from "@/types/auth";

describe("public registration role boundaries", () => {
  it.each(["verification_officer", "customer_support", "admin"])("rejects %s", (role) => {
    expect(isRegisterableRole(role)).toBe(false);
    const result = validateRegistration({
      email: "person@example.test",
      fullName: "Test Person",
      password: "StrongPassword1!",
      role,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.role).toBe("Choose renter or landlord.");
  });

  it.each(["renter", "landlord"])("accepts %s", (role) => {
    expect(isRegisterableRole(role)).toBe(true);
    expect(validateRegistration({
      email: "person@example.test",
      fullName: "Test Person",
      password: "StrongPassword1!",
      role,
    }).ok).toBe(true);
  });
});
