import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  }),
}));

import HelpPage from "./page";
import SupportPage from "../support/page";

const cases = [
  ["verification_officer", "/verification/dashboard", "Back to verification workspace"],
  ["customer_support", "/support-desk/dashboard", "Back to support workspace"],
  ["admin", "/admin/dashboard", "Back to admin workspace"],
  ["landlord", "/landlord/dashboard", "Back to workspace"],
  ["renter", "/", "Back to map"],
] as const;

describe("help and support return navigation", () => {
  beforeEach(() => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it.each(cases)("returns active %s to the correct destination", async (role, href, label) => {
    mocks.profile.mockResolvedValue({ data: { role, is_suspended: false } });
    const help = await HelpPage();
    const support = await SupportPage({});
    expect(help.props.children[0].props).toMatchObject({ backHref: href, backLabel: label });
    expect(support.props).toMatchObject({ backHref: href, backLabel: label });
  });

  it.each(["verification_officer", "customer_support"])("does not link suspended %s to a staff workspace", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role, is_suspended: true } });
    expect((await HelpPage()).props.children[0].props).toMatchObject({ backHref: "/", backLabel: "Back to map" });
    expect((await SupportPage({})).props).toMatchObject({ backHref: "/", backLabel: "Back to map" });
  });

  it("returns guests to the map", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await HelpPage()).props.children[0].props).toMatchObject({ backHref: "/", backLabel: "Back to map" });
    expect((await SupportPage({})).props).toMatchObject({ backHref: "/", backLabel: "Back to map" });
  });
});
