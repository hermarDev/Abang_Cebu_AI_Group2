import { describe, expect, expectTypeOf, it } from "vitest";
import { getRoleHomeRoute, isWorkspaceRole, type RegisterableRole } from "./auth";

it("limits public registration roles to renter and landlord", () => {
  expectTypeOf<RegisterableRole>().toEqualTypeOf<"renter" | "landlord">();
});

describe("workspace role routing helpers", () => {
  it("identifies workspace-only roles", () => {
    expect(isWorkspaceRole("admin")).toBe(true);
    expect(isWorkspaceRole("verification_officer")).toBe(true);
    expect(isWorkspaceRole("customer_support")).toBe(true);
    expect(isWorkspaceRole("landlord")).toBe(true);
    expect(isWorkspaceRole("renter")).toBe(false);
    expect(isWorkspaceRole(null)).toBe(false);
    expect(isWorkspaceRole(undefined)).toBe(false);
  });

  it("maps each role to its canonical home route", () => {
    expect(getRoleHomeRoute("admin")).toBe("/admin/dashboard");
    expect(getRoleHomeRoute("verification_officer")).toBe("/verification/dashboard");
    expect(getRoleHomeRoute("customer_support")).toBe("/support-desk/dashboard");
    expect(getRoleHomeRoute("landlord")).toBe("/landlord/dashboard");
    expect(getRoleHomeRoute("renter")).toBe("/");
    expect(getRoleHomeRoute(null)).toBe("/");
  });
});
