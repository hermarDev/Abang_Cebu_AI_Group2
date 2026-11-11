import { describe, expect, it, vi } from "vitest";
import AdminReviewsPage from "./page";

const { mockGetUser, mockSelect, mockSign } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSign: vi.fn(),
  mockSelect: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({ select: mockSelect })),
  }),
}));

vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: mockSign }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

describe("AdminReviewsPage", () => {
  it("redirects unauthenticated users to login", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("no user") });
    await expect(AdminReviewsPage({})).rejects.toThrow("REDIRECT:/login?next=%2Fadmin%2Freviews");
  });

  it("blocks non-admin users with notFound", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u-renter" } }, error: null });
    mockSelect.mockReturnValueOnce({
      eq: () => ({ maybeSingle: vi.fn().mockResolvedValueOnce({ data: { role: "renter", is_suspended: false }, error: null }) }),
    });
    await expect(AdminReviewsPage({})).rejects.toThrow("NOT_FOUND");
  });

  it("renders for active admin and hands a signed avatar to the layout", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u-admin" } }, error: null });
    const select = vi.fn().mockReturnValueOnce({
      eq: () => ({ maybeSingle: vi.fn().mockResolvedValueOnce({ data: { role: "admin", is_suspended: false, full_name: "Admin User", avatar_url: "u-admin/a.png" }, error: null }) }),
    });
    mockSelect.mockImplementationOnce(select);
    mockSign.mockResolvedValueOnce("https://example.test/signed.png");
    const jsx = await AdminReviewsPage({ searchParams: Promise.resolve({ status: "pending", search: "Lahug" }) });
    expect(select).toHaveBeenCalledWith(expect.stringContaining("avatar_url"));
    expect(mockSign).toHaveBeenCalledWith("u-admin", "u-admin/a.png");
    expect(jsx.props.avatarUrl).toBe("https://example.test/signed.png");
  });
});
