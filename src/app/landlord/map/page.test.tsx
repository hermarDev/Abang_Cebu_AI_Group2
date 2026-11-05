import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  from: (table: string) => table === "profiles" ? { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) } : { select: () => ({ eq: mocks.eq }) },
}) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound, usePathname: () => "/landlord/map" }));
vi.mock("@/features/landlord/LandlordPropertyMap", () => ({ LandlordPropertyMap: ({ properties, loadError }: { properties: { title: string }[]; loadError: boolean }) => <div>{loadError ? "Properties unavailable" : properties.map(p => p.title).join(", ")}</div> }));
import LandlordMapPage from "./page";

describe("landlord property map", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
    mocks.notFound.mockImplementation(() => { throw new Error("not found"); });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-a" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "landlord", is_suspended: false }, error: null });
    mocks.eq.mockReturnValue({ order: mocks.order });
    mocks.order.mockReturnValue({ limit: mocks.limit });
    mocks.limit.mockResolvedValue({ data: [{ id: "one", title: "My rental", latitude: 10.3, longitude: 123.9 }], error: null });
  });
  it("denies guests and non-landlords", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(LandlordMapPage()).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Flandlord%2Fmap");
    mocks.profile.mockResolvedValueOnce({ data: { role: "renter", is_suspended: false }, error: null });
    await expect(LandlordMapPage()).rejects.toThrow("not found");
    expect(mocks.eq).not.toHaveBeenCalled();
  });
  it("loads only the landlord's properties", async () => {
    const html = renderToStaticMarkup(await LandlordMapPage());
    expect(mocks.eq).toHaveBeenCalledWith("owner_id", "owner-a");
    expect(html).toContain("My rental");
    expect(html).not.toContain('max-w-[1440px]');
    expect(html).toContain('src="/icons/main_Logo.png"');
    expect(html).toContain('src="/icons/main_Logo_Light.png"');
    expect(html).toMatch(/<a[^>]*aria-label="Back to dashboard"[^>]*><svg[^>]*lucide-arrow-left/);
  });
  it("shows an error if properties cannot load", async () => {
    mocks.limit.mockResolvedValueOnce({ data: null, error: { message: "failed" } });
    expect(renderToStaticMarkup(await LandlordMapPage())).toContain("Properties unavailable");
  });
});