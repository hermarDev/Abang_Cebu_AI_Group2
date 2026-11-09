import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }) }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound, useRouter: () => ({ refresh: vi.fn() }), usePathname: () => "/list-property" }));
import ListPropertyPage from "./page";

describe("property form preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
    mocks.notFound.mockImplementation(() => { throw new Error("not found"); });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "landlord-a" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "landlord", is_suspended: false }, error: null });
  });
  it("requires an active landlord", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(ListPropertyPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Flist-property");
    mocks.profile.mockResolvedValueOnce({ data: { role: "renter", is_suspended: false }, error: null });
    await expect(ListPropertyPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("not found");
  });
  it("describes the live form instead of a preview", async () => {
    const html = renderToStaticMarkup(await ListPropertyPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Save a draft at any step");
    expect(html).not.toContain("not available yet");
    expect(html).toMatch(/<a[^>]*aria-label="Back to dashboard"[^>]*><svg[^>]*lucide-arrow-left/);
    expect(html).toContain("First rental unit");
    expect(html).toContain('name="propertyType"');
    expect(html).toContain('name="rentalType"');
    expect(html).toContain('name="barangay"');
    expect(html).toContain("Unit type");
    expect(html).toContain("Monthly rent (PHP)");
    expect(html).toContain("Property details");
    expect(html).toContain("Save draft");
    expect(html).not.toContain('aria-label="Landlord mobile navigation"');
    expect(html).toContain("Tenant preference");
  });
});