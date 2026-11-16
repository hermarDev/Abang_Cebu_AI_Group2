import { describe, expect, it, vi } from "vitest";
import { FinderPage } from "./FinderPage";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: vi.fn().mockResolvedValue(null) }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

describe("FinderPage role confinement", () => {
  it.each([
    ["landlord", "/landlord/dashboard"],
    ["admin", "/admin/dashboard"],
    ["verification_officer", "/verification/dashboard"],
    ["customer_support", "/support-desk/dashboard"],
  ] as const)("redirects active %s to %s", async (role, destination) => {
    const user = { id: "staff-id", user_metadata: {} };
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { role, is_suspended: false } }),
          }),
        }),
      }),
    };
    await expect(FinderPage({ verifiedSession: { user, supabase } as never })).rejects.toThrow(
      `redirect:${destination}`,
    );
  });

  it.each(["verification_officer", "customer_support"] as const)(
    "does not redirect suspended %s to a staff workspace",
    async (role) => {
      const user = { id: "staff-id", user_metadata: {} };
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role, is_suspended: true } }),
            }),
          }),
        }),
      };
      const element = await FinderPage({ verifiedSession: { user, supabase } as never });
      expect(element.props.userRole).toBe(role);
    },
  );
});
