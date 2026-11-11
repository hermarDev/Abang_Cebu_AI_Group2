import { describe, expect, it, vi } from "vitest";
import AdminReportsPage from "./page";

const { mockGetUser, mockSelect, mockSign } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockSelect: vi.fn(), mockSign: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getUser: mockGetUser }, from: vi.fn(() => ({ select: mockSelect })) }),
}));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: mockSign }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));

const profileRow = (data: Record<string, unknown>) => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValueOnce({ data, error: null }) }) });

describe("AdminReportsPage", () => {
  it("redirects unauthenticated users to login", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("no user") });
    await expect(AdminReportsPage({})).rejects.toThrow("REDIRECT:/login?next=%2Fadmin%2Freports");
  });

  it("blocks non-admin users with notFound", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u-renter" } }, error: null });
    mockSelect.mockReturnValueOnce(profileRow({ role: "renter", is_suspended: false }));
    await expect(AdminReportsPage({})).rejects.toThrow("NOT_FOUND");
  });

  it("signs the admin avatar and passes it to the layout", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u-admin" } }, error: null });
    mockSelect.mockReturnValueOnce(profileRow({ role: "admin", is_suspended: false, full_name: "Admin User", avatar_url: "u-admin/a.png" }));
    mockSign.mockResolvedValueOnce("https://example.test/signed.png");
    const jsx = await AdminReportsPage({});
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining("avatar_url"));
    expect(mockSign).toHaveBeenCalledWith("u-admin", "u-admin/a.png");
    expect(jsx.props.avatarUrl).toBe("https://example.test/signed.png");
  });
});
