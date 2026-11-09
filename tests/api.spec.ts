import { test, expect } from "@playwright/test";

test("registration rejects malformed JSON before contacting auth", async ({ request }) => {
  const response = await request.post("/api/auth/register", {
    headers: { "content-type": "application/json" }, data: Buffer.from("{"),
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({ success: false, error: { code: "VALIDATION_ERROR" } });
});

test("registration rejects missing fields before contacting auth", async ({ request }) => {
  const response = await request.post("/api/auth/register", { data: {} });
  expect(response.status()).toBe(422);
  expect(await response.json()).toMatchObject({ success: false, error: { code: "VALIDATION_ERROR" } });
});

for (const query of ["", "ab", "x".repeat(121)]) {
  test(`place search rejects invalid query length ${query.length}`, async ({ request }) => {
    const response = await request.get("/api/places", { params: { q: query } });
    expect(response.status()).toBe(400);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Enter 3–120 characters to search Cebu." });
  });
}

// Security regressions: every private endpoint must reject a cookie-less caller with 401 before any RPC/DB work.
const guestGets = ["/api/messages/threads", "/api/messages/unread-count", "/api/admin/overview", "/api/admin/reports", "/api/admin/accounts", "/api/admin/audit", "/api/favorites"];
for (const path of guestGets) {
  test(`GET ${path} rejects guests with 401`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toEqual({ error: expect.stringMatching(/^Sign in/) });
  });
}

for (const path of ["/api/reports", "/api/blocks"]) {
  test(`POST ${path} rejects guests with 401 even for a well-formed body`, async ({ request }) => {
    const response = await request.post(path, { data: { operationId: "11111111-1111-4111-8111-111111111111", targetUserId: "22222222-2222-4222-8222-222222222222" } });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Sign in to access messages." });
  });
}

// requireMessagingUser checks the session BEFORE x-expected-user-id, so without hosted Supabase the 409 branch is unreachable: a guest always gets 401.
test("POST /api/messages/threads: guest with a mismatched x-expected-user-id gets 401, not 409/200/500, and no contact data", async ({ request }) => {
  const response = await request.post("/api/messages/threads", {
    headers: { "x-expected-user-id": "33333333-3333-4333-8333-333333333333" },
    data: { listingId: "44444444-4444-4444-8444-444444444444", operationId: "55555555-5555-4555-8555-555555555555", body: "Is this still available?" },
  });
  expect(response.status()).toBe(401);
  const text = await response.text();
  expect(JSON.parse(text)).toEqual({ error: "Sign in to access messages." });
  expect(text).not.toMatch(/email|phone/i);
});
