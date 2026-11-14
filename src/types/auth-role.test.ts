import { expectTypeOf, it } from "vitest";
import type { RegisterableRole } from "./auth";

it("limits public registration roles to renter and landlord", () => {
  expectTypeOf<RegisterableRole>().toEqualTypeOf<"renter" | "landlord">();
});
