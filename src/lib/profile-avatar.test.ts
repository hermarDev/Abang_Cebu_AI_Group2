import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createAdminClient: vi.fn(), sign: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
import { signProfileAvatar } from "./profile-avatar";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createAdminClient.mockReturnValue({ storage: { from: () => ({ createSignedUrl: mocks.sign }) } });
});

it("returns null when the signing client cannot initialize", async () => {
  mocks.createAdminClient.mockImplementation(() => { throw new Error("missing config"); });
  await expect(signProfileAvatar("abc123", "abc123/photo.webp")).resolves.toBeNull();
});

it("returns null when signing rejects", async () => {
  mocks.sign.mockRejectedValue(new Error("storage offline"));
  await expect(signProfileAvatar("abc123", "abc123/photo.webp")).resolves.toBeNull();
});

it("returns the signed URL when signing succeeds", async () => {
  mocks.sign.mockResolvedValue({ data: { signedUrl: "https://example.test/photo" }, error: null });
  await expect(signProfileAvatar("abc123", "abc123/photo.webp")).resolves.toBe("https://example.test/photo");
});
