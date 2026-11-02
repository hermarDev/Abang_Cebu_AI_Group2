import { AuthSessionMissingError } from "@supabase/supabase-js";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }));
import { getAssistantAccess } from "./assistant-access";

beforeEach(() => vi.clearAllMocks());
it("keeps normal guest access when the session is absent", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() });
  const access = await getAssistantAccess();
  expect(access.user).toBeNull();
  expect((await getAssistantAccess(true)).response?.status).toBe(401);
});

it("does not classify an unavailable authentication service as a guest", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("auth unavailable") });
  const access = await getAssistantAccess();
  expect("response" in access && access.response?.status).toBe(503);
});
