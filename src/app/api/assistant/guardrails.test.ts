import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), provider: vi.fn() }));
vi.mock("@/server/assistant-access", () => ({ getAssistantAccess: mocks.access }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("sends a rental-focused scope and off-topic redirection policy to the provider", async () => {
  mocks.access.mockResolvedValue({ user: null, supabase: {} });
  mocks.provider.mockResolvedValue(Response.json({ choices: [{ message: { content: "I can help with Cebu rentals." } }] }));
  vi.stubGlobal("fetch", mocks.provider);
  vi.stubEnv("GROQ_API_KEY", "test-key");
  const response = await POST(new Request("http://localhost/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Assistant-Owner": "guest" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Write a Python script" }] }),
  }));
  expect(response?.status).toBe(200);
  const request = JSON.parse(mocks.provider.mock.calls[0][1].body);
  expect(request.messages[0].role).toBe("system");
  expect(request.messages[0].content).toMatch(/off-topic/i);
  expect(request.messages[0].content).toMatch(/coding/i);
  expect(request.messages[0].content).toMatch(/greetings/i);
  expect(request.messages[0].content).toMatch(/follow-up/i);
  expect(request.messages[0].content).toMatch(/password reset/i);
  expect(request.messages[1].content).toBe("Write a Python script");
});
