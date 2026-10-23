import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSupabaseAuthCookies, logout } from "./logout";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut } }),
}));

function createCookieStore(names: string[]) {
  const deleted: string[] = [];
  const cookies = names.map((name) => ({ name, value: "token" }));
  return {
    cookies,
    deleted,
    store: {
      getAll: () => cookies,
      delete: (name: string) => {
        deleted.push(name);
      },
    },
  };
}

describe("logout", () => {
  beforeEach(() => signOut.mockReset().mockResolvedValue({ error: null }));

  it("revokes the current session before clearing every Supabase auth cookie chunk", async () => {
    const { store, deleted } = createCookieStore([
      "sb-project-auth-token",
      "sb-project-auth-token.0",
      "sb-project-auth-token.1",
      "sb-project-auth-token-code-verifier",
      "unrelated",
    ]);
    const order: string[] = [];
    signOut.mockImplementation(async () => {
      order.push("revoke");
      return { error: null };
    });
    store.delete = (name: string) => {
      deleted.push(name);
      order.push(`delete:${name}`);
    };

    await logout(store);

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(order[0]).toBe("revoke");
    expect(deleted).toEqual([
      "sb-project-auth-token",
      "sb-project-auth-token.0",
      "sb-project-auth-token.1",
      "sb-project-auth-token-code-verifier",
    ]);
  });

  it("clears auth cookies even if Supabase revocation fails", async () => {
    const { store, deleted } = createCookieStore([
      "sb-project-auth-token.0",
      "other-cookie",
    ]);
    signOut.mockResolvedValue({ error: new Error("revocation failed") });

    await expect(logout(store)).rejects.toThrow("revocation failed");
    expect(deleted).toEqual(["sb-project-auth-token.0"]);
  });

  it("does not include names that only contain the auth cookie pattern", () => {
    const { store, deleted } = createCookieStore([
      "sb-project-auth-token-extra",
      "my-sb-project-auth-token",
    ]);

    clearSupabaseAuthCookies(store);

    expect(deleted).toEqual([]);
  });
});
