vi.mock("server-only", () => ({}));
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: (table: string) => {
      if (table === "profiles") return { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) };
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

let uid = "account-b";
let actorCounter = 0;
const threadUuid = "12345678-1234-4234-8234-123456789abc";
const opUuid = "87654321-4321-4321-8321-abcdefabcdef";
const unitUuid = "11100000-0000-4000-8000-000000000001";
let ipCounter = 0;
const headers = (...args: [expected?: string]): Record<string, string> => ({
  "content-type": "application/json",
  "x-forwarded-for": `10.0.0.${++ipCounter}`,
  ...(args.length === 0 ? { "x-expected-user-id": uid } : args[0] === undefined ? {} : { "x-expected-user-id": args[0] }),
});

beforeEach(() => {
  vi.resetAllMocks();
  uid = `account-b-${++actorCounter}`;
  mocks.getUser.mockResolvedValue({ data: { user: { id: uid } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: { agreementId: "ag-1", status: "renter_agreed", bothAgreed: false }, error: null });
});

import { POST } from "./route";

const ctx = (threadId = threadUuid) => ({ params: Promise.resolve({ threadId }) });
const url = () => `http://localhost/api/messages/threads/${threadUuid}/agreement`;
const post = (body: unknown, h = headers(), id = threadUuid) =>
  POST(new Request(url(), { method: "POST", headers: h, body: JSON.stringify(body) }), ctx(id));

describe("POST /api/messages/threads/[threadId]/agreement", () => {
  it("calls set_rental_agreement_consent and returns agreement status", async () => {
    const res = await post({ operationId: opUuid, agree: true, unitId: unitUuid });
    expect(res.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("set_rental_agreement_consent", {
      p_conversation_id: threadUuid,
      p_operation_id: opUuid,
      p_agree: true,
      p_unit_id: unitUuid,
    });
    const body = await res.json();
    expect(body).toEqual({
      agreement: { agreementId: "ag-1", status: "renter_agreed", bothAgreed: false },
    });
  });

  it("400 on invalid threadId or missing operationId", async () => {
    const resBadThread = await post({ operationId: opUuid }, headers(), "not-a-uuid");
    expect(resBadThread.status).toBe(400);

    const resNoOp = await post({ agree: true });
    expect(resNoOp.status).toBe(400);
  });

  it("handles withdrawal when agree is false", async () => {
    mocks.rpc.mockResolvedValue({ data: { agreementId: "ag-1", status: "cancelled", bothAgreed: false }, error: null });
    const res = await post({ operationId: opUuid, agree: false });
    expect(res.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("set_rental_agreement_consent", {
      p_conversation_id: threadUuid,
      p_operation_id: opUuid,
      p_agree: false,
      p_unit_id: null,
    });
  });
});
