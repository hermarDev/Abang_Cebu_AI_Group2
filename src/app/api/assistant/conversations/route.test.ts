import { beforeEach, describe, expect, it, vi } from "vitest";
import { assistantConversationsLimiter } from "@/server/api-limiters";

const mocks = vi.hoisted(() => ({
  getAssistantAccess: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/server/assistant-access", () => ({
  getAssistantAccess: mocks.getAssistantAccess,
}));

import { GET, POST } from "./route";

const validMessages = [
  { role: "user", content: "Any rooms in Lahug?" },
  { role: "assistant", content: "Here are some options in Lahug." },
];

function makeGetRequest(owner = "renter-1", ip = "198.51.100.10") {
  return new Request("http://localhost/api/assistant/conversations", {
    method: "GET",
    headers: {
      "x-real-ip": ip,
      "X-Assistant-Owner": owner,
    },
  });
}

function makePostRequest(body: string, owner = "renter-1", ip = "198.51.100.10") {
  return new Request("http://localhost/api/assistant/conversations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": ip,
      "X-Assistant-Owner": owner,
    },
    body,
  });
}

describe("assistant conversations route", () => {
  beforeEach(() => {
    assistantConversationsLimiter.reset();
    mocks.from.mockReset();
    mocks.getAssistantAccess.mockReset().mockResolvedValue({
      user: { id: "renter-1" },
      supabase: { from: mocks.from },
    });
  });

  it("rejects GET when X-Assistant-Owner does not match authenticated user", async () => {
    const res = await GET(makeGetRequest("other-user"));
    expect(res?.status).toBe(409);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rate limits GET requests via assistantConversationsLimiter", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ select });

    for (let i = 0; i < 30; i++) {
      const res = await GET(makeGetRequest("renter-1"));
      expect(res?.status).toBe(200);
    }

    const limited = await GET(makeGetRequest("renter-1"));
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("retry-after")).toBeTruthy();
  });

  it("rejects oversized POST body with 413 before parsing JSON", async () => {
    const oversized = JSON.stringify({ messages: [{ role: "user", content: "a".repeat(130 * 1024) }] });
    const res = await POST(makePostRequest(oversized));
    expect(res?.status).toBe(413);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects invalid conversation payloads with 400", async () => {
    const res = await POST(makePostRequest(JSON.stringify({ messages: [{ role: "user", content: "only one" }] })));
    expect(res?.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("maps database 54000 limit error to 409 without a pre-insert count query", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: "54000" } });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mocks.from.mockReturnValue({ insert });

    const res = await POST(makePostRequest(JSON.stringify({ messages: validMessages })));
    expect(res?.status).toBe(409);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});
