import { describe, expect, it, vi } from "vitest";
import { FinderPage } from "./FinderPage";

vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: vi.fn().mockResolvedValue(null) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("FinderPage staff roles", () => {
  it.each(["verification_officer", "customer_support"] as const)("preserves %s from the verified profile", async (role) => {
    const user = { id: "staff-id", user_metadata: {} };
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role, is_suspended: false } }) }) }) }) };
    const element = await FinderPage({ verifiedSession: { user, supabase } as never });
    expect(element.props.userRole).toBe(role);
  });
});
