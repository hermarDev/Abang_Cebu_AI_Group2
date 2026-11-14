import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), submission: vi.fn(), sign: vi.fn(), signProof: vi.fn(), eq: vi.fn(), is: vi.fn(), select: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: (table: string) => table === "profiles" ? ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }) : mocks.from(table) }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mocks.from, storage: { from: (bucket: string) => ({ createSignedUrls: bucket === "field-verification-media" ? mocks.signProof : mocks.sign }) } }) }));
import { GET } from "./route";
import { adminLifecycleLimiter } from "@/server/admin-access";
const A = "12345678-1234-4234-8234-123456789abc";
const B = "22345678-1234-4234-8234-123456789abc";
const path = A + "/" + B + "/" + A + "/" + "a".repeat(64) + ".pdf";
const proofPath = A + "/" + B + "/" + A + "/" + "b".repeat(64) + ".jpg";
const call = (revision = "3") => GET(new Request("http://localhost/api/admin/properties/" + A + "/revision?draftId=" + B + "&revision=" + revision, { headers: { "x-expected-user-id": "admin" } }), { params: Promise.resolve({ id: A }) });
beforeEach(() => {
  adminLifecycleLimiter.reset();
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "admin" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
  const query = { select: mocks.select, eq: mocks.eq, is: mocks.is, maybeSingle: mocks.submission };
  mocks.from.mockReturnValue(query); mocks.select.mockReturnValue(query); mocks.eq.mockReturnValue(query); mocks.is.mockReturnValue(query);
  mocks.submission.mockResolvedValue({ data: { operation_id: A, draft_id: B, expected_revision: 3, snapshot_payload: { property: { title: "Snapshot" }, unit: {}, amenities: [] }, snapshot_media: [{ kind: "permit", object_path: path }], review_status: "pending", field_verification_status: "verified", field_verified_by: "officer-uuid", field_verified_at: "2026-11-15T10:00:00Z", field_verification_method: "site_visit", field_verification_notes: "Verified in person", field_verification_proof: [{ kind: "photo", object_path: proofPath }], field_verification_proxy_name: "Proxy Name", field_verification_proxy_relationship: "Relative" }, error: null });
  mocks.sign.mockResolvedValue({ data: [{ path, signedUrl: "https://storage/signed" }], error: null });
  mocks.signProof.mockResolvedValue({ data: [{ path: proofPath, signedUrl: "https://proof/signed" }], error: null });
});
describe("pending revision read", () => {
  it("rate limits revision reads before accessing privileged data", async () => {
    for (let i = 0; i < 60; i++) expect((await call()).status).toBe(200);
    mocks.from.mockClear();
    expect((await call()).status).toBe(429);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("reads exact unsuperseded pending snapshot and signs private media without exposing paths", async () => {
    const response = await call();
    expect(response.status).toBe(200);
    expect(mocks.select).toHaveBeenCalledWith(expect.stringContaining("operation_id"));
    expect(mocks.eq).toHaveBeenCalledWith("property_id", A);
    expect(mocks.eq).toHaveBeenCalledWith("draft_id", B);
    expect(mocks.eq).toHaveBeenCalledWith("expected_revision", 3);
    expect(mocks.eq).toHaveBeenCalledWith("review_status", "pending");
    expect(mocks.is).toHaveBeenCalledWith("superseded_by", null);
    expect(mocks.sign).toHaveBeenCalledWith([path], 900);
    expect((await response.json()).revision).toMatchObject({ id: A, snapshotMedia: [{ kind: "permit", url: "https://storage/signed" }] });
  });
  it("returns live FVO fields and signed field_verification_proof URLs", async () => {
    const response = await call();
    expect(response.status).toBe(200);
    expect(mocks.signProof).toHaveBeenCalledWith([proofPath], 900);
    const json = await response.json();
    expect(json.revision).toMatchObject({
      fieldVerificationStatus: "verified",
      fieldVerifiedBy: "officer-uuid",
      fieldVerifiedAt: "2026-11-15T10:00:00Z",
      fieldVerificationMethod: "site_visit",
      fieldVerificationNotes: "Verified in person",
      fieldVerificationProxyName: "Proxy Name",
      fieldVerificationProxyRelationship: "Relative",
      fieldVerificationProof: [{ kind: "photo", object_path: proofPath, signedUrl: "https://proof/signed" }],
    });
  });
  it("degrades gracefully when field_verification_proof signing fails", async () => {
    mocks.signProof.mockResolvedValueOnce({ data: [], error: { message: "signing failed" } });
    const response = await call();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.revision.fieldVerificationProof).toEqual([{ kind: "photo", object_path: proofPath, signedUrl: null }]);
  });
  it.each(["3junk", "0", "9007199254740992"])("rejects malformed revision %s", async (value) => { expect((await call(value)).status).toBe(400); expect(mocks.from).not.toHaveBeenCalled(); });
  it.each(["renter", "landlord"])("denies %s before privileged access", async (role) => { mocks.profile.mockResolvedValue({ data: { role, is_suspended: false } }); expect((await call()).status).toBe(403); expect(mocks.from).not.toHaveBeenCalled(); });
  it("denies suspended admin", async () => { mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: true } }); expect((await call()).status).toBe(403); expect(mocks.from).not.toHaveBeenCalled(); });
  it("rejects anonymous and changed accounts", async () => { mocks.getUser.mockResolvedValueOnce({ data: { user: null } }); expect((await call()).status).toBe(401); mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "other" } } }); expect((await call()).status).toBe(409); });
  it("fails closed for superseded or missing submissions", async () => { mocks.submission.mockResolvedValue({ data: null, error: null }); expect((await call()).status).toBe(409); });
  it("fails closed when a document cannot be signed", async () => { mocks.sign.mockResolvedValue({ data: [], error: null }); expect((await call()).status).toBe(503); });
  it.each([null, "invalid"])("fails closed for unavailable snapshot media %s", async (snapshot_media) => {
    mocks.submission.mockResolvedValue({ data: { snapshot_payload: { property: {}, unit: {} }, snapshot_media }, error: null });
    expect((await call()).status).toBe(409);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("fails closed for a query outage", async () => { mocks.submission.mockResolvedValue({ data: null, error: { message: "offline" } }); expect((await call()).status).toBe(503); });
  it("fails closed for invalid storage paths", async () => {
    mocks.submission.mockResolvedValue({ data: { snapshot_payload: { property: {}, unit: {} }, snapshot_media: [{ kind: "permit", object_path: "https://evil/document" }] } });
    expect((await call()).status).toBe(503); expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("keeps an empty snapshot empty without draft fallback", async () => {
    mocks.submission.mockResolvedValue({ data: { operation_id: A, draft_id: B, expected_revision: 3, snapshot_payload: { property: {}, unit: {} }, snapshot_media: [], review_status: "pending" } });
    const response = await call();
    expect(response.status).toBe(200);
    expect((await response.json()).revision.snapshotMedia).toEqual([]);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});