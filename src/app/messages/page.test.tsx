import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ profile: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "test-user" } }, error: null }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import MessagesPage from "./page";

beforeEach(() => {
  mocks.redirect.mockReset().mockImplementation((path: string) => { throw new Error(`redirect:${path}`); });
});

it.each([
  ["customer_support", "/support-desk/dashboard"],
  ["verification_officer", "/verification/dashboard"],
  ["admin", "/admin/dashboard"],
  ["landlord", "/landlord/messages"],
])("routes %s away from renter messages", async (role, destination) => {
  mocks.profile.mockResolvedValue({ data: { role, is_suspended: false } });
  await expect(MessagesPage()).rejects.toThrow(`redirect:${destination}`);
});
