import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { signOut, cookies, deleted, nextResponseJson } = vi.hoisted(() => ({
  signOut: vi.fn(),
  cookies: [] as { name: string; value: string }[],
  deleted: [] as string[],
  nextResponseJson: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut } }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => cookies,
    delete: (name: string) => deleted.push(name),
  }),
}));
vi.mock("next/server", () => ({
  NextResponse: {
    json: nextResponseJson,
  },
}));

function request(body?: unknown) {
  return new Request("http://localhost/api/logout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("logout route", () => {
  beforeEach(() => {
    signOut.mockReset().mockResolvedValue({ error: null });
    nextResponseJson.mockReset().mockImplementation((body, init) =>
      Response.json(body, init),
    );
    cookies.splice(0, cookies.length,
      { name: "sb-project-auth-token", value: "token" },
      { name: "sb-project-auth-token.0", value: "chunk" },
      { name: "other-cookie", value: "keep" },
    );
    deleted.splice(0);
  });

  it("revokes the local session, clears auth cookie chunks, and returns success", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(deleted).toEqual([
      "sb-project-auth-token",
      "sb-project-auth-token.0",
    ]);
  });

  it("clears the local cookie even when server-side revocation fails", async () => {
    signOut.mockResolvedValue({ error: new Error("revocation failed") });

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(deleted).toEqual([
      "sb-project-auth-token",
      "sb-project-auth-token.0",
    ]);
    expect(await response.json()).not.toHaveProperty("error.message", "revocation failed");
  });

  it("rejects malformed JSON without invoking Supabase", async () => {
    const response = await POST(new Request("http://localhost/api/logout", {
      method: "POST",
      body: "{",
    }));

    expect(response.status).toBe(400);
    expect(signOut).not.toHaveBeenCalled();
    expect(deleted).toEqual([]);
  });
});
