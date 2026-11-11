import { describe, expect, it, vi } from "vitest";
import AdminAccountsPage from "./page";

const { mockGetUser, mockSelect, mockSign } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSign: vi.fn(),
  mockSelect: vi.fn(),
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

describe("AdminAccountsPage", () => {
  it("redirects unauthenticated users to login", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("no user") });
    await expect(AdminAccountsPage({})).rejects.toThrow("REDIRECT:/login?next=%2Fadmin%2Faccounts");
  });

  it("blocks non-admin users with notFound", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u-landlord" } }, error: null });
    mockSelect.mockReturnValueOnce({
      eq: () => ({ maybeSingle: vi.fn().mockResolvedValueOnce({ data: { role: "landlord", is_suspended: false }, error: null }) }),
    });
    await expect(AdminAccountsPage({})).rejects.toThrow("NOT_FOUND");
  });

  it("renders for active admin and hands a signed avatar to the layout", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u-admin" } }, error: null });
    const select = vi.fn().mockReturnValueOnce({
      eq: () => ({ maybeSingle: vi.fn().mockResolvedValueOnce({ data: { role: "admin", is_suspended: false, full_name: "Admin User", avatar_url: "u-admin/a.png" }, error: null }) }),
    });
    mockSelect.mockImplementationOnce(select);
    mockSign.mockResolvedValueOnce("https://example.test/signed.png");
    const jsx = await AdminAccountsPage({ searchParams: Promise.resolve({ role: "landlord", status: "active" }) });
    expect(select).toHaveBeenCalledWith(expect.stringContaining("avatar_url"));
    expect(mockSign).toHaveBeenCalledWith("u-admin", "u-admin/a.png");
    expect(jsx.props.avatarUrl).toBe("https://example.test/signed.png");
  });
});
