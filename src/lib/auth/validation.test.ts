import { describe, expect, it } from "vitest";
import { normalizePhilippineMobile, validateRegistration } from "./validation";

describe("normalizePhilippineMobile", () => {
  it.each([
    ["09171234567", "+639171234567"],
    ["+639171234567", "+639171234567"],
    ["639171234567", "+639171234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhilippineMobile(input)).toBe(expected);
  });

  it.each(["08171234567", "+12345678901", "12345", "+63917123456", "+6391712345678"])("rejects invalid number %s", (input) => {
    expect(normalizePhilippineMobile(input)).toBeNull();
  });
});

describe("validateRegistration", () => {
  const validPayload = {
    email: "Mika.Example+Test@example.com",
    password: "R3nt!ngSafe",
    fullName: "  Mika   Santos  ",
    role: "renter",
    phoneNumber: "09171234567",
    preferredLandmark: " USC Talamban ",
  };

  it("normalizes valid payload fields and PH mobile", () => {
    expect(validateRegistration(validPayload)).toEqual({
      ok: true,
      value: {
        email: "mika.example+test@example.com",
        password: "R3nt!ngSafe",
        fullName: "Mika Santos",
        role: "renter",
        phoneNumber: "+639171234567",
        preferredLandmark: "USC Talamban",
      },
    });
  });

  it.each([
    "Abcdef12",
    "Abcdef1!",
    `A1!${"a".repeat(69)}`,
  ])("accepts a password at a server policy length boundary", (password) => {
    expect(validateRegistration({ ...validPayload, password }).ok).toBe(true);
  });

  it("rejects a Unicode character as a substitute for the password symbol class", () => {
    const result = validateRegistration({ ...validPayload, password: "Abcdefgh😀" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty("password");
  });

  it("returns actionable required-field errors for malformed payloads", () => {
    for (const payload of [null, "payload", []]) {
      const result = validateRegistration(payload);
      expect(result).toEqual({
        ok: false,
        errors: {
          role: "Choose renter or landlord.",
          email: "Enter a valid email address.",
          password: "Use 8–72 characters with at least 3 of: uppercase, lowercase, number, symbol.",
          fullName: "Enter a name of 2–100 letters, spaces, hyphens, or periods.",
        },
      });
    }
  });

  it("returns field-specific errors without echoing submitted personal data", () => {
    const privateEmail = "not-a-valid-private@example";
    const privatePassword = "PrivatePassword";
    const privateName = "<Private Person>";
    const result = validateRegistration({
      ...validPayload,
      email: privateEmail,
      password: privatePassword,
      fullName: privateName,
      role: "admin",
      phoneNumber: 123,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        role: "Choose renter or landlord.",
        email: "Enter a valid email address.",
        password: "Use 8–72 characters with at least 3 of: uppercase, lowercase, number, symbol.",
        fullName: "Enter a name of 2–100 letters, spaces, hyphens, or periods.",
        phoneNumber: "Enter a valid Philippine mobile number.",
      });
      const safeErrors = JSON.stringify(result.errors);
      for (const privateValue of [privateEmail, privatePassword, privateName]) {
        expect(safeErrors).not.toContain(privateValue);
      }
    }
  });

  it("omits an empty optional phone number from the registration payload", () => {
    const result = validateRegistration({ ...validPayload, phoneNumber: "" });
    expect(result).toEqual({
      ok: true,
      value: {
        email: "mika.example+test@example.com",
        password: "R3nt!ngSafe",
        fullName: "Mika Santos",
        role: "renter",
        preferredLandmark: "USC Talamban",
      },
    });
  });

  it.each([
    [{ ...validPayload, role: "admin" }, "role"],
    [{ ...validPayload, password: "weak" }, "password"],
    [{ ...validPayload, password: "a".repeat(73) }, "password"],
    [{ ...validPayload, email: "invalid" }, "email"],
    [{ ...validPayload, fullName: "<script>alert(1)</script>" }, "fullName"],
    [{ ...validPayload, phoneNumber: "123" }, "phoneNumber"],
    [{ ...validPayload, preferredLandmark: "x".repeat(101) }, "preferredLandmark"],
  ])("rejects invalid registration field", (input, field) => {
    const result = validateRegistration(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty(field);
  });

  it("rejects non-object payloads", () => {
    expect(validateRegistration(null).ok).toBe(false);
    expect(validateRegistration("payload").ok).toBe(false);
    expect(validateRegistration([]).ok).toBe(false);
  });
});
