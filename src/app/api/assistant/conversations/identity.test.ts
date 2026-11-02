import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), from: vi.fn() }));
vi.mock("@/server/assistant-access", () => ({ getAssistantAccess: mocks.access }));
import { GET, POST, PATCH, DELETE } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
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
  const query = { insert: vi.fn(), select: vi.fn(), single: vi.fn() };
  query.insert.mockReturnValue(query);
  query.select.mockReturnValue(query);
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
