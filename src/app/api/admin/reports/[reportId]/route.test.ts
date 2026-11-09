import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
import { GET, POST } from "./route";
import { adminReportsLimiter } from "@/server/admin-access";

const H = { "x-expected-user-id": "admin-1" };
const R = "12345678-1234-4234-8234-123456789abc";
const OP = "22345678-1234-4234-8234-123456789abc";
const ctx = (reportId = R) => ({ params: Promise.resolve({ reportId }) });
const get = (qs = "", headers: Record<string, string> = H, reportId = R) => GET(new Request(`http://localhost/api/admin/reports/${reportId}${qs}`, { headers }), ctx(reportId));
const valid = { operationId: OP, decision: "resolved", resolutionNote: "  Confirmed scam  ", suspendTargetUser: true, unpublishTargetListing: false };
const post = (body: unknown, headers: Record<string, string> = H, reportId = R) => POST(new Request(`http://localhost/api/admin/reports/${reportId}`, { method: "POST", headers, body: JSON.stringify(body) }), ctx(reportId));

beforeEach(() => {
  vi.resetAllMocks();
  adminReportsLimiter.reset();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: { id: R }, error: null });
});

const guards = (call: (headers?: Record<string, string>) => Promise<Response>) => {
  it("401 unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await call()).status).toBe(401);
  });
  it("409 on user mismatch", async () => expect((await call({ "x-expected-user-id": "x" })).status).toBe(409));
  it.each(["renter", "landlord"])("403 for %s", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role, is_suspended: false }, error: null });
    expect((await call()).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
};

describe("GET /api/admin/reports/[reportId]", () => {
  guards((h) => get("", h));
  it("400 for bad report or operation id", async () => {
    expect((await get("", H, "nope")).status).toBe(400);
    expect((await get("?operationId=nope")).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("passes the supplied operationId, or generates one", async () => {
    expect(await (await get(`?operationId=${OP}`)).json()).toEqual({ report: { id: R } });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_get_abuse_report_detail", { p_report_id: R, p_operation_id: OP });
    await get();
    const generated = mocks.rpc.mock.calls[1][1].p_operation_id;
    expect(generated).toMatch(/^[0-9a-f-]{36}$/);
    expect(generated).not.toBe(OP);
  });
  it.each([["42501", 403], ["23505", 409], ["22023", 404], ["XX000", 503]])("maps rpc %s to %i", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await get()).status).toBe(status);
  });
});

describe("POST /api/admin/reports/[reportId]", () => {
  guards((h) => post(valid, h));
  it.each([
    [{ ...valid, operationId: "x" }], [{ ...valid, decision: "approve" }],
    [{ ...valid, suspendTargetUser: "yes" }], [{ ...valid, unpublishTargetListing: 1 }],
  ])("400 invalid %j", async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([[undefined], ["  "], ["abcd"], ["x".repeat(1001)]])("400 for bad note %j", async (resolutionNote) => {
    expect((await post({ ...valid, resolutionNote })).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("200 passes trimmed note; flags default false", async () => {
    mocks.rpc.mockResolvedValue({ data: { reportId: R, status: "resolved" }, error: null });
    expect(await (await post(valid)).json()).toEqual({ report: { reportId: R, status: "resolved" } });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_resolve_abuse_report", {
      p_report_id: R, p_operation_id: OP, p_decision: "resolved", p_resolution_note: "Confirmed scam",
      p_suspend_target_user: true, p_unpublish_target_listing: false,
    });
    await post({ operationId: OP, decision: "dismissed", resolutionNote: "No violation" });
    expect(mocks.rpc.mock.calls[1][1]).toMatchObject({ p_suspend_target_user: false, p_unpublish_target_listing: false });
  });
  it.each([["42501", 403], ["23505", 409], ["40001", 409], ["22023", 400], ["XX000", 503]])("maps rpc %s to %i", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await post(valid)).status).toBe(status);
  });
  it("429 after 60 actions", async () => {
    for (let i = 0; i < 60; i++) expect((await post(valid)).status).toBe(200);
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
