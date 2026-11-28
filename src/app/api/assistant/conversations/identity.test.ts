import { beforeEach, expect, it, vi } from "vitest";
import { assistantConversationsLimiter } from "@/server/api-limiters";

const mocks = vi.hoisted(() => ({ access: vi.fn(), from: vi.fn() }));
vi.mock("@/server/assistant-access", () => ({ getAssistantAccess: mocks.access }));
import { GET, POST, PATCH, DELETE } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  assistantConversationsLimiter.reset();
  mocks.access.mockResolvedValue({ user: { id: "account-b" }, supabase: { from: mocks.from } });
});

it.each(["GET", "PATCH", "DELETE"] as const)("rejects a mismatched account before %s queries the database", async (method) => {
  const request = new Request("http://localhost/api/assistant/conversations", { method, headers: { "X-Assistant-Owner": "account-a" } });
  const response = await { GET, PATCH, DELETE }[method](request);
  expect(response?.status).toBe(409);
  expect(mocks.from).not.toHaveBeenCalled();
});

it.each(["GET", "POST", "PATCH", "DELETE"] as const)("rejects unbound legacy %s before any database query", async (method) => {
  const response = await { GET, POST, PATCH, DELETE }[method](new Request("http://localhost/api/assistant/conversations", { method }));
  expect(response?.status).toBe(409);
  expect(mocks.from).not.toHaveBeenCalled();
});

it("allows a create with matching expected owner", async () => {
  const owner = "account-b";
  const countQuery = { eq: vi.fn().mockResolvedValue({ count: 0, error: null }) };
  const query = { insert: vi.fn(), select: vi.fn(), single: vi.fn() };
  query.select.mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => (opts?.head ? countQuery : query));
  query.insert.mockReturnValue(query);
  query.single.mockResolvedValue({ data: { id: "row", title: "Test", messages: [{ role: "user", content: "Question" }, { role: "assistant", content: "Reply" }], created_at: "now", updated_at: "now" }, error: null });
  mocks.from.mockReturnValue(query);
  const request = new Request("http://localhost/api/assistant/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(owner ? { "X-Assistant-Owner": owner } : {}) },
    body: JSON.stringify({ messages: [{ role: "user", content: "Question" }, { role: "assistant", content: "Reply" }] }),
  });
  const response = await POST(request);
  expect(response?.status).toBe(201);
  expect(mocks.from).toHaveBeenCalledWith("assistant_conversations");
});

it("maps DB 54000 conversation-limit trigger error to 409", async () => {
  const countQuery = { eq: vi.fn().mockResolvedValue({ count: 49, error: null }) };
  const query = { insert: vi.fn(), select: vi.fn(), single: vi.fn() };
  query.select.mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => (opts?.head ? countQuery : query));
  query.insert.mockReturnValue(query);
  query.single.mockResolvedValue({ data: null, error: { code: "54000", message: "assistant conversation limit reached" } });
  mocks.from.mockReturnValue(query);
  const request = new Request("http://localhost/api/assistant/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Assistant-Owner": "account-b" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Question" }, { role: "assistant", content: "Reply" }] }),
  });
  const response = await POST(request);
  expect(response?.status).toBe(409);
});

it.each(["POST", "PATCH", "DELETE"] as const)("enforces assistantConversationsLimiter on %s and returns 429", async (method) => {
  const countQuery = { eq: vi.fn().mockResolvedValue({ count: 0, error: null }) };
  const query = {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };
  query.select.mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => (opts?.head ? countQuery : query));
  query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.single.mockResolvedValue({ data: { id: "11111111-1111-4111-8111-111111111111", title: "Test", messages: [{ role: "user", content: "Q" }, { role: "assistant", content: "A" }], created_at: "now", updated_at: "now" }, error: null });
  query.maybeSingle.mockResolvedValue({ data: { id: "11111111-1111-4111-8111-111111111111", title: "Test", messages: [{ role: "user", content: "Q" }, { role: "assistant", content: "A" }], created_at: "now", updated_at: "now" }, error: null });
  mocks.from.mockReturnValue(query);

  const handler = { POST, PATCH, DELETE }[method];
  const payload = method === "DELETE"
    ? { id: "11111111-1111-4111-8111-111111111111" }
    : method === "PATCH"
      ? { id: "11111111-1111-4111-8111-111111111111", messages: [{ role: "user", content: "Q" }, { role: "assistant", content: "A" }] }
      : { messages: [{ role: "user", content: "Q" }, { role: "assistant", content: "A" }] };

  for (let i = 0; i < 30; i++) {
    const res = await handler(new Request("http://localhost/api/assistant/conversations", {
      method,
      headers: { "Content-Type": "application/json", "X-Assistant-Owner": "account-b", "X-Real-IP": `198.51.100.${i}` },
      body: JSON.stringify(payload),
    }));
    expect(res?.status).toBeLessThan(400);
  }

  const limited = await handler(new Request("http://localhost/api/assistant/conversations", {
    method,
    headers: { "Content-Type": "application/json", "X-Assistant-Owner": "account-b", "X-Real-IP": "198.51.100.200" },
    body: JSON.stringify(payload),
  }));
  expect(limited?.status).toBe(429);
  expect(Number(limited?.headers.get("Retry-After"))).toBeGreaterThan(0);
});

it("rejects an account A chat sent after the cookie changes to account B", async () => {
  const query = { insert: vi.fn(), select: vi.fn(), single: vi.fn() };
  query.insert.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.single.mockResolvedValue({ data: { id: "row", title: "A", messages: [], created_at: "now", updated_at: "now" }, error: null });
  mocks.from.mockReturnValue(query);
  const request = new Request("http://localhost/api/assistant/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Assistant-Owner": "account-a" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Private A" }, { role: "assistant", content: "Reply" }] }),
  });
  const response = await POST(request);
  expect(response?.status).toBe(409);
  expect(mocks.from).not.toHaveBeenCalled();
});
