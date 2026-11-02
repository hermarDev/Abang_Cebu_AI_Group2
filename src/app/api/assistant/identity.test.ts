import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), provider: vi.fn() }));
vi.mock("@/server/assistant-access", () => ({ getAssistantAccess: mocks.access }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ user: { id: "account-b" }, supabase: {} });
  vi.stubGlobal("fetch", mocks.provider);
});

it("returns unavailable instead of treating an auth backend error as a guest", async () => {
  mocks.access.mockResolvedValue({ response: Response.json({ error: "Authentication unavailable" }, { status: 503 }) });
  const response = await POST(new Request("http://localhost/api/assistant", { method: "POST", headers: { "X-Assistant-Owner": "account-a" }, body: "{}" }));
  expect(response?.status).toBe(503);
  expect(mocks.provider).not.toHaveBeenCalled();
});

it("rejects an unbound authenticated request before provider access", async () => {
  const response = await POST(new Request("http://localhost/api/assistant", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Private A" }] }),
  }));
  expect(response?.status).toBe(409);
  expect(mocks.provider).not.toHaveBeenCalled();
});

it("accepts the guest identity precondition for a guest session", async () => {
  mocks.access.mockResolvedValue({ user: null, supabase: {} });
  const response = await POST(new Request("http://localhost/api/assistant", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Assistant-Owner": "guest" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Guest question" }] }),
  }));
  expect(response?.status).not.toBe(409);
});

it("rejects a guest request when the server session belongs to an account", async () => {
  const response = await POST(new Request("http://localhost/api/assistant", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Assistant-Owner": "guest" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Guest private question" }] }),
  }));
  expect(response?.status).toBe(409);
  expect(mocks.provider).not.toHaveBeenCalled();
});

it("rejects stale account A before account B's session sends a chat to the provider", async () => {
  const response = await POST(new Request("http://localhost/api/assistant", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Assistant-Owner": "account-a" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Private A" }] }),
  }));
  expect(response?.status).toBe(409);
  expect(mocks.provider).not.toHaveBeenCalled();
});
