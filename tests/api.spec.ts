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
