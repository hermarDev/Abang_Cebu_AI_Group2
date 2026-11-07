import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(async (): Promise<{ data: { user: { id: string } | null }; error: unknown }> => ({ data: { user: { id: "landlord-1" } }, error: null })),
  profile: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { role: "landlord", is_suspended: false }, error: null })),
  draft: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { id: "draft-1", revision: 1 }, error: null })),
  prepare: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { objectPath: "landlord-1/draft-1/op/sha.jpg", sha256: "sha", resumed: false }, error: null })),
  confirm: vi.fn(async (): Promise<{ error: unknown }> => ({ error: null })),
  upload: vi.fn(async (): Promise<{ error: unknown }> => ({ error: null })),
  download: vi.fn(async (): Promise<{ data: Blob | null; error: unknown }> => ({ data: null, error: null })),
  media: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: [{ operation_id: "22222222-2222-4222-8222-222222222222", kind: "photo", content_type: "image/jpeg", size_bytes: 7, content_sha256: "a".repeat(64), object_path: `landlord-1/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/${"a".repeat(64)}.jpg` }], error: null })),
  signed: vi.fn(async (): Promise<{ data: { signedUrl: string } | null; error: unknown }> => ({ data: { signedUrl: "https://signed.test/file" }, error: null })),
  admin: vi.fn(),
  adminRpc: vi.fn(async (): Promise<{ error: unknown }> => ({ error: null })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: (table: string) => table === "property_draft_media" ? { select: () => ({ eq: () => ({ eq: () => ({ order: mocks.media }) }) }) } : { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.draft }), maybeSingle: mocks.profile }) }) }, rpc: mocks.prepare, storage: { from: () => ({ upload: mocks.upload, download: mocks.download, createSignedUrl: mocks.signed }) } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const sha = createHash("sha256").update(jpeg).digest("hex");
const path = `landlord-1/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/${sha}.jpg`;
function request(fields: Record<string, string | File>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request("http://localhost/api/property-drafts/media", { method: "POST", body: form, headers: { "x-expected-user-id": "landlord-1" } });
}
function valid() { return request({ draftId: "11111111-1111-4111-8111-111111111111", operationId: "22222222-2222-4222-8222-222222222222", kind: "photo", file: new File([jpeg], "photo.jpg", { type: "image/jpeg" }) }); }

beforeEach(() => { vi.clearAllMocks(); mocks.download.mockReset().mockResolvedValue({ data: new Blob([jpeg]), error: null }); mocks.prepare.mockResolvedValue({ data: { objectPath: path, sha256: sha, resumed: false }, error: null }); mocks.admin.mockReturnValue({ storage: { from: () => ({ upload: mocks.upload, download: mocks.download, createSignedUrl: mocks.signed }) }, rpc: mocks.adminRpc }); });

describe("property draft media", () => {
  it("releases an owner's exact reservation without touching storage", async () => {
    mocks.prepare.mockResolvedValueOnce({ data: "released", error: null });
    const req = new Request("http://localhost/api/property-drafts/media", { method: "DELETE", headers: { "content-type": "application/json", "x-expected-user-id": "landlord-1" }, body: JSON.stringify({ draftId: "11111111-1111-4111-8111-111111111111", operationId: "22222222-2222-4222-8222-222222222222" }) });
    const response = await DELETE(req);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: "released" });
    expect(mocks.prepare).toHaveBeenCalledWith("release_property_draft_media", { p_draft_id: "11111111-1111-4111-8111-111111111111", p_operation_id: "22222222-2222-4222-8222-222222222222" });
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it.each(["confirmed", "missing"])("reports a %s reservation without deleting an object", async (state) => {
    mocks.prepare.mockResolvedValueOnce({ data: state, error: null });
    const req = new Request("http://localhost/api/property-drafts/media", { method: "DELETE", headers: { "content-type": "application/json", "x-expected-user-id": "landlord-1" }, body: JSON.stringify({ draftId: "11111111-1111-4111-8111-111111111111", operationId: "22222222-2222-4222-8222-222222222222" }) });
    const response = await DELETE(req);
    expect(await response.json()).toEqual({ state });
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("preserves uncertainty when the release response is lost", async () => {
    mocks.prepare.mockRejectedValueOnce(new Error("response lost"));
    const req = new Request("http://localhost/api/property-drafts/media", { method: "DELETE", headers: { "content-type": "application/json", "x-expected-user-id": "landlord-1" }, body: JSON.stringify({ draftId: "11111111-1111-4111-8111-111111111111", operationId: "22222222-2222-4222-8222-222222222222" }) });
    const response = await DELETE(req);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "The file status could not be confirmed. Retry the same request." });
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("rejects release on account mismatch before an RPC", async () => {
    const req = new Request("http://localhost/api/property-drafts/media", { method: "DELETE", headers: { "content-type": "application/json", "x-expected-user-id": "other" }, body: "{}" });
    expect((await DELETE(req)).status).toBe(409);
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated requests", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await POST(valid())).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("rejects account mismatch", async () => {
    const req = valid(); req.headers.set("x-expected-user-id", "other");
    expect((await POST(req)).status).toBe(409);
  });
  it("rejects unsupported bytes", async () => {
    const req = request({ draftId: "11111111-1111-4111-8111-111111111111", operationId: "22222222-2222-4222-8222-222222222222", kind: "photo", file: new File([new Uint8Array([1, 2, 3])], "x.jpg", { type: "image/jpeg" }) });
    expect((await POST(req)).status).toBe(400);
  });
  it("rejects oversized files before reading their bytes", async () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
    const read = vi.spyOn(file, "arrayBuffer");
    const form = new FormData();
    form.set("draftId", "11111111-1111-4111-8111-111111111111");
    form.set("operationId", "22222222-2222-4222-8222-222222222222");
    form.set("kind", "photo");
    form.set("file", file);
    const req = valid();
    vi.spyOn(req, "formData").mockResolvedValueOnce(form);
    expect((await POST(req)).status).toBe(400);
    expect(read).not.toHaveBeenCalled();
  });
  it("rejects drafts not owned by the landlord", async () => {
    mocks.draft.mockResolvedValueOnce({ data: null, error: null });
    expect((await POST(valid())).status).toBe(404);
  });
  it("rejects a prepare response for another object before any storage access", async () => {
    mocks.prepare.mockResolvedValueOnce({ data: { objectPath: "another-owner/private.pdf", sha256: sha, resumed: false }, error: null });
    expect((await POST(valid())).status).toBe(503);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it("rejects a prepare response with a different content hash", async () => {
    mocks.prepare.mockResolvedValueOnce({ data: { objectPath: path, sha256: "0".repeat(64), resumed: false }, error: null });
    expect((await POST(valid())).status).toBe(503);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it("reports missing server storage configuration without confirming", async () => {
    mocks.admin.mockImplementationOnce(() => { throw new Error("missing configuration"); });
    expect((await POST(valid())).status).toBe(503);
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it("confirms through the service role with the verified owner", async () => {
    const response = await POST(valid());
    if (!response || response.status !== 200) throw new Error("expected 200");
    expect(mocks.adminRpc).toHaveBeenCalledWith("confirm_property_draft_media", expect.objectContaining({ p_owner_id: "landlord-1", p_draft_id: "11111111-1111-4111-8111-111111111111", p_operation_id: "22222222-2222-4222-8222-222222222222", p_sha256: sha, p_object_path: path }));
  });
  it("preserves the original Unicode filename in the prepared intent", async () => {
    const req = request({ draftId: "11111111-1111-4111-8111-111111111111", operationId: "22222222-2222-4222-8222-222222222222", kind: "photo", file: new File([jpeg], "kuwarto ñ.jpg", { type: "image/jpeg" }) });
    expect((await POST(req)).status).toBe(200);
    expect(mocks.prepare).toHaveBeenCalledWith("prepare_property_draft_media", expect.objectContaining({ p_original_name: "kuwarto ñ.jpg" }));
  });
  it("reports uncertain confirmation and preserves the uploaded object when the RPC rejects", async () => {
    mocks.adminRpc.mockRejectedValueOnce(new Error("connection lost after commit"));
    const response = await POST(valid());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "The file confirmation could not be verified. Retry the same upload." });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });
  it("uploads and confirms a new private object", async () => {
    const response = await POST(valid());
    expect(response.status).toBe(200);
    expect(mocks.admin).toHaveBeenCalledTimes(2);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.adminRpc).toHaveBeenCalledTimes(1);
  });
  it("retries upload when preparation resumed before any object was stored", async () => {
    mocks.prepare.mockResolvedValueOnce({ data: { objectPath: path, sha256: sha, resumed: true, confirmed: false }, error: null });
    expect((await POST(valid())).status).toBe(200);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.adminRpc).toHaveBeenCalledTimes(1);
  });
  it("refuses to confirm when a newly uploaded object has different bytes", async () => {
    mocks.download.mockResolvedValueOnce({ data: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 4])]), error: null });
    expect((await POST(valid())).status).toBe(503);
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it("recovers an existing upload only when its bytes match", async () => {
    mocks.upload.mockResolvedValueOnce({ error: { status: 409 } });
    mocks.download.mockResolvedValueOnce({ data: new Blob([jpeg]), error: null });
    expect((await POST(valid())).status).toBe(200);
    expect(mocks.download).toHaveBeenCalledTimes(1);
    expect(mocks.adminRpc).toHaveBeenCalledTimes(1);
  });
  it("refuses to confirm a conflicting object with different bytes", async () => {
    mocks.upload.mockResolvedValueOnce({ error: { status: 409 } });
    mocks.download.mockResolvedValueOnce({ data: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 4])]), error: null });
    expect((await POST(valid())).status).toBe(503);
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it("fails closed if the conflicting object cannot be read", async () => {
    mocks.upload.mockResolvedValueOnce({ error: { status: 409 } });
    mocks.download.mockRejectedValueOnce(new Error("storage unavailable"));
    expect((await POST(valid())).status).toBe(503);
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it("does not reconcile unrelated upload errors", async () => {
    mocks.upload.mockResolvedValueOnce({ error: { status: 403 } });
    expect((await POST(valid())).status).toBe(503);
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it("does not re-upload an already confirmed operation with matching bytes", async () => {
    mocks.prepare.mockResolvedValueOnce({ data: { objectPath: path, sha256: sha, resumed: true, confirmed: true }, error: null });
    mocks.download.mockResolvedValueOnce({ data: new Blob([jpeg]), error: null });
    expect((await POST(valid())).status).toBe(200);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.download).toHaveBeenCalledTimes(1);
  });
  it("does not report a confirmed retry successful if its object is missing", async () => {
    mocks.prepare.mockResolvedValueOnce({ data: { objectPath: path, sha256: sha, resumed: true, confirmed: true }, error: null });
    mocks.download.mockResolvedValueOnce({ data: null, error: { message: "missing" } });
    expect((await POST(valid())).status).toBe(503);
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it("maps conflicting operations to 409", async () => {
    mocks.prepare.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
    expect((await POST(valid())).status).toBe(409);
  });
});

describe("property draft media restore", () => {
  it("refuses to sign metadata pointing to another owner's object", async () => {
    mocks.media.mockResolvedValueOnce({ data: [{ operation_id: "22222222-2222-4222-8222-222222222222", kind: "photo", content_type: "image/jpeg", size_bytes: 7, content_sha256: sha, object_path: "other-owner/private.jpg" }], error: null });
    const req = new Request("http://localhost/api/property-drafts/media?draftId=11111111-1111-4111-8111-111111111111", { headers: { "x-expected-user-id": "landlord-1" } });
    expect((await GET(req)).status).toBe(503);
    expect(mocks.signed).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("lists only confirmed media for the owner's draft and signs private objects", async () => {
    const req = new Request("http://localhost/api/property-drafts/media?draftId=11111111-1111-4111-8111-111111111111", { headers: { "x-expected-user-id": "landlord-1" } });
    const response = await GET(req);
    expect(response.status).toBe(200);
    const body = await response.json() as { media: Array<{ signedUrl: string }> };
    expect(body.media[0].signedUrl).toBe("https://signed.test/file");
    expect(mocks.media).toHaveBeenCalled();
    expect(mocks.signed).toHaveBeenCalledWith(`landlord-1/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/${"a".repeat(64)}.jpg`, expect.any(Number));
  });
  it("fails the entire restore when a private file cannot be signed", async () => {
    mocks.signed.mockResolvedValueOnce({ data: null, error: { message: "storage unavailable" } });
    const req = new Request("http://localhost/api/property-drafts/media?draftId=11111111-1111-4111-8111-111111111111", { headers: { "x-expected-user-id": "landlord-1" } });
    const response = await GET(req);
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty("media");
  });
  it("rejects another owner's draft", async () => {
    mocks.draft.mockResolvedValueOnce({ data: null, error: null });
    const req = new Request("http://localhost/api/property-drafts/media?draftId=11111111-1111-4111-8111-111111111111", { headers: { "x-expected-user-id": "landlord-1" } });
    expect((await GET(req)).status).toBe(404);
  });
});
