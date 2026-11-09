import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MessageItem, MessagingInbox } from "./MessagingInbox";
import { composerBlockedReason, listingBadgeLabel, listingHref, mergeMessages, postThreadMessage, type RentalMessageItem, type RentalThreadSummary } from "./messaging-client";

vi.mock("@/components/ui/Modal", () => ({ Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null }));

const thread = (over: Partial<RentalThreadSummary> = {}): RentalThreadSummary => ({
  id: "t1", listingId: "l1", listingTitle: "Cozy room <b>Lahug</b>", listingPrice: 8500, listingStatus: "published", listingAvailable: true, listingPhotoUrl: null,
  counterpart: { id: "u2", fullName: "Maria Santos", avatarUrl: null, role: "landlord" }, unreadCount: 3, isArchived: false, isBlocked: false, blockedByViewer: false,
  canSend: true, lastMessagePreview: "Is it still available?", lastMessageAt: "2026-11-09T01:00:00Z", ...over,
});
const render = (props: Partial<React.ComponentProps<typeof MessagingInbox>> = {}) => renderToStaticMarkup(<MessagingInbox userId="u1" userRole="renter" {...props} />);

describe("MessagingInbox rendering", () => {
  it("shows four thread skeletons while loading", () => {
    const html = render();
    expect(html).toContain('aria-label="Loading conversations"');
    expect(html.match(/animate-pulse/g)?.length).toBe(4);
  });

  it("renders filter tabs and a thread row with unread count, badge, counterpart and escaped text", () => {
    const html = render({ initialThreads: [thread()] });
    expect(html).toContain("Active");
    expect(html).toContain("(1)");
    expect(html).toContain("Archived");
    expect(html).toContain("Published · Available");
    expect(html).toContain("Maria Santos");
    expect(html).toContain('aria-label="3 unread"');
    expect(html).toContain("Is it still available?");
    expect(html).not.toContain("<b>Lahug</b>");
    expect(html).toContain("&lt;b&gt;Lahug&lt;/b&gt;");
    expect(html).toContain('placeholder="Search conversations…"');
  });

  it("opens the property context banner with the role-specific link and thread actions", () => {
    const renter = render({ initialThreads: [thread()], initialThreadId: "t1" });
    expect(renter).toContain('href="/?selected=l1"');
    expect(renter).toContain("Back to messages");
    for (const label of ["Archive", "Block user", "Report"]) expect(renter).toContain(label);
    expect(render({ initialThreads: [thread()], initialThreadId: "t1", userRole: "landlord" })).toContain('href="/landlord/map?selected=l1"');
  });

  it("disables the composer with a clear banner when the thread cannot send", () => {
    const html = render({ initialThreads: [thread({ canSend: false, isBlocked: true, blockedByViewer: true })], initialThreadId: "t1" });
    expect(html).toContain("You blocked this user");
    expect(html).toMatch(/<textarea[^>]*disabled/);
  });

  it("shows Unblock user and Unarchive where applicable", () => {
    const html = render({ initialThreads: [thread({ canSend: false, isBlocked: true, blockedByViewer: true, isArchived: true })], initialThreadId: "t1" });
    expect(html).toContain("Unblock user");
    expect(html).toContain("Unarchive");
  });

  it("renders the modern inline composer with send icon and helper text", () => {
    const html = render({ initialThreads: [thread()], initialThreadId: "t1" });
    expect(html).toContain('aria-label="Send message"');
    expect(html).toContain("Enter to send · Shift+Enter for new line");
    expect(html).toContain("0 / 2000");
  });
});

describe("per-message reporting", () => {
  const m = (senderId: string): RentalMessageItem => ({ id: "m1", conversationId: "t1", senderId, operationId: "o", body: "hello", createdAt: "2026-11-09T00:00:00Z" });
  it("renders Report message only on counterpart messages", () => {
    expect(renderToStaticMarkup(<MessageItem message={m("u2")} mine={false} onReport={() => {}} />)).toContain('aria-label="Report message"');
    expect(renderToStaticMarkup(<MessageItem message={m("u1")} mine onReport={() => {}} />)).not.toContain("Report message");
  });
  it("prefers listingThumbnailUrl over listingPhotoUrl", () => {
    const html = render({ initialThreads: [thread({ listingThumbnailUrl: "https://cdn.test/thumb.jpg", listingPhotoUrl: "https://cdn.test/photo.jpg" })] });
    expect(html).toContain("thumb.jpg");
    expect(html).not.toContain("photo.jpg");
  });
});

describe("messaging helpers", () => {
  it("maps listing state to the canonical badge", () => {
    expect(listingBadgeLabel({ listingStatus: "published", listingAvailable: true })).toBe("Published · Available");
    for (const listingStatus of ["archived", "removed"]) expect(listingBadgeLabel({ listingStatus, listingAvailable: true })).toBe("Listing no longer available");
    expect(listingBadgeLabel({ listingStatus: "published", listingAvailable: false })).toBe("Listing no longer available");
  });

  it("explains why the composer is disabled", () => {
    const base = thread({ canSend: false });
    expect(composerBlockedReason(thread())).toBeNull();
    expect(composerBlockedReason({ ...base, blockedByViewer: true })).toBe("You blocked this user");
    expect(composerBlockedReason({ ...base, listingStatus: "removed" })).toBe("Listing no longer available");
    expect(composerBlockedReason(base)).toBe("This conversation is unavailable");
  });

  it("builds listing links and merges messages without duplicates", () => {
    expect(listingHref({ listingId: "a b" }, "renter")).toBe("/?selected=a%20b");
    const m = (id: string, createdAt: string): RentalMessageItem => ({ id, conversationId: "t1", senderId: "u1", operationId: id, body: id, createdAt });
    expect(mergeMessages([m("b", "2")], [m("a", "1"), m("b", "2")]).map(x => x.id)).toEqual(["a", "b"]);
  });

  it("reuses the same operationId when retrying a failed send", async () => {
    const message = { id: "m1", conversationId: "t1", senderId: "u1", operationId: "op-1", body: "hi", createdAt: "2026-11-09T00:00:00Z" };
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message }) });
    await expect(postThreadMessage("t1", "u1", "op-1", "hi", fetchImpl as unknown as typeof fetch)).rejects.toThrow();
    await expect(postThreadMessage("t1", "u1", "op-1", "hi", fetchImpl as unknown as typeof fetch)).resolves.toEqual(message);
    const bodies = fetchImpl.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies).toEqual([{ operationId: "op-1", body: "hi" }, { operationId: "op-1", body: "hi" }]);
    expect(fetchImpl.mock.calls[0][1].headers["x-expected-user-id"]).toBe("u1");
  });
});
