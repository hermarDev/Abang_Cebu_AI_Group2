import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingInquiryModal, clearPendingInquiryIntents, resolveInquiryIntent, submitInquiry } from "./ListingInquiryModal";

vi.mock("@/components/ui/Modal", () => ({ Modal: ({ open, title, description, children }: { open: boolean; title: string; description?: string; children: React.ReactNode }) => open ? <div aria-label={title}><p>{description}</p>{children}</div> : null }));
vi.mock("@/components/ui/AppToaster", () => ({ notify: vi.fn() }));

const listingId = "11111111-1111-4111-8111-111111111111";
const reply = (status: number, payload: unknown) => ({ ok: status < 400, status, json: async () => payload }) as Response;

beforeEach(() => clearPendingInquiryIntents());

describe("ListingInquiryModal", () => {
  it("renders a 2000-char message form for the listing", () => {
    const html = renderToStaticMarkup(<ListingInquiryModal listingId={listingId} listingTitle="Lahug studio" userId="u1" onClose={vi.fn()} />);
    expect(html).toContain("Message landlord");
    expect(html).toContain("About Lahug studio");
    expect(html).toContain('maxLength="2000"');
    expect(html).toContain("0/2000");
    expect(html).toContain("Send message");
  });

  it("posts listingId, operationId and body with the expected-user header and returns the conversation id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply(201, { conversationId: "c1" }));
    const result = await submitInquiry("u1:l", "u1", listingId, "Is it available?", fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ conversationId: "c1", error: null });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/messages/threads");
    expect(init.method).toBe("POST");
    expect(init.headers["x-expected-user-id"]).toBe("u1");
    expect(JSON.parse(init.body)).toEqual({ listingId, operationId: expect.stringMatching(/^[0-9a-f-]{36}$/), body: "Is it available?" });
  });

  it("reuses the exact operationId and body when an ambiguous failure is retried", async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(reply(503, { error: "Try later." }))
      .mockResolvedValueOnce(reply(200, { conversationId: "c1", replayed: true }));
    const f = fetchImpl as unknown as typeof fetch;
    expect((await submitInquiry("k", "u1", listingId, "Hello", f)).error).toBeTruthy();
    expect((await submitInquiry("k", "u1", listingId, "Hello", f)).error).toBe("Try later.");
    expect((await submitInquiry("k", "u1", listingId, "Hello", f)).conversationId).toBe("c1");
    const ids = fetchImpl.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(new Set(ids.map((b) => b.operationId)).size).toBe(1);
    expect(ids.every((b) => b.body === "Hello" && b.listingId === listingId)).toBe(true);
  });

  it("starts a new intent after success, a definitive rejection, or edited text", async () => {
    const ok = vi.fn().mockResolvedValue(reply(201, { conversationId: "c1" })) as unknown as typeof fetch;
    await submitInquiry("k", "u1", listingId, "Hello", ok);
    const rejected = vi.fn().mockResolvedValue(reply(403, { error: "No." })) as unknown as typeof fetch;
    await submitInquiry("k", "u1", listingId, "Hello", rejected);
    await submitInquiry("k", "u1", listingId, "Hello", ok);
    const ids = [ok, rejected].flatMap((f) => (f as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([, init]) => JSON.parse(init.body).operationId));
    expect(new Set(ids).size).toBe(3);
    const a = resolveInquiryIntent("e", listingId, "one", () => "id-1");
    expect(resolveInquiryIntent("e", listingId, "one", () => "id-2")).toBe(a);
    expect(resolveInquiryIntent("e", listingId, "two", () => "id-2").operationId).toBe("id-2");
  });

  it("treats a success response without a conversation id as an ambiguous failure", async () => {
    const f = vi.fn().mockResolvedValue(reply(201, {})) as unknown as typeof fetch;
    expect((await submitInquiry("k", "u1", listingId, "Hi", f)).error).toBeTruthy();
    expect(resolveInquiryIntent("k", listingId, "Hi", () => "x").operationId).not.toBe("x");
  });
});
