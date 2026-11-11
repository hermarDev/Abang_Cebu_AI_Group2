import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
  signAvatar: vi.fn(),
}));

vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: mocks.signAvatar }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.profile,
        }),
      }),
    }),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
  usePathname: () => "/landlord/messages",
}));
vi.mock("@/features/messages/MessagingInbox", () => ({
  MessagingInbox: ({ userId, userRole, initialThreadId }: { userId: string; userRole: string; initialThreadId?: string | null }) => (
    <div data-testid="messaging-inbox" data-user-id={userId} data-role={userRole} data-thread={initialThreadId ?? ""} />
  ),
}));
import LandlordMessagesPage from "./page";

describe("LandlordMessagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
    mocks.notFound.mockImplementation(() => { throw new Error("not found"); });
    mocks.signAvatar.mockReset().mockResolvedValue(null);
    mocks.getUser.mockResolvedValue({ data: { user: { id: "landlord-1" } }, error: null });
    mocks.profile.mockResolvedValue({
      data: { full_name: "Test Landlord", role: "landlord", is_suspended: false, avatar_url: "avatars/photo.png" },
      error: null,
    });
  });

  it("redirects unauthenticated users to login with next param", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "no user" } });
    await expect(LandlordMessagesPage()).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Flandlord%2Fmessages");
  });

  it("denies access to non-landlord or suspended users", async () => {
    mocks.profile.mockResolvedValueOnce({ data: { role: "renter", is_suspended: false }, error: null });
    await expect(LandlordMessagesPage()).rejects.toThrow("not found");

    mocks.profile.mockResolvedValueOnce({ data: { role: "landlord", is_suspended: true }, error: null });
    await expect(LandlordMessagesPage()).rejects.toThrow("not found");

    mocks.profile.mockResolvedValueOnce({ data: null, error: { message: "error" } });
    await expect(LandlordMessagesPage()).rejects.toThrow("not found");
  });

  it("renders messages page with Property map action and AccountMenu", async () => {
    mocks.signAvatar.mockResolvedValueOnce("https://example.com/avatar.jpg");
    const html = renderToStaticMarkup(await LandlordMessagesPage());

    expect(mocks.signAvatar).toHaveBeenCalledWith("landlord-1", "avatars/photo.png");
    expect(html).toContain('aria-label="Open property map"');
    expect(html).toContain('href="/landlord/map"');
    expect(html).toContain("Property map");
    expect(html).toContain("Test Landlord");
    expect(html).toContain('src="https://example.com/avatar.jpg"');
    expect(html).toContain('aria-label="Account options for Test Landlord"');
    expect(html).toContain('data-testid="messaging-inbox"');
    expect(html).toContain('data-user-id="landlord-1"');
    expect(html).toContain('data-role="landlord"');
  });

  it("passes thread param to MessagingInbox when provided", async () => {
    const html = renderToStaticMarkup(
      await LandlordMessagesPage({ searchParams: Promise.resolve({ thread: "thread-123" }) })
    );
    expect(html).toContain('data-thread="thread-123"');
  });
});