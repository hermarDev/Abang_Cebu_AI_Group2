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
