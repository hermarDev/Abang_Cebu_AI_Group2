import { describe, expect, it } from "vitest";
import { normalizeApiError } from "./api-error";

const FB = "Something went wrong.";

describe("normalizeApiError", () => {
  it.each([
    [0, "network", true],
    [400, "validation", false],
    [422, "validation", false],
    [401, "unauthenticated", false],
    [403, "forbidden", false],
    [404, "not_found", false],
    [409, "conflict", false],
    [429, "rate_limit", true],
    [500, "server", true],
    [503, "server", true],
  ])("maps status %i to %s (canRetry=%s)", (status, kind, canRetry) => {
    expect(normalizeApiError(status, null, FB)).toMatchObject({ kind, canRetry, message: FB });
  });

  it("uses a safe payload error or message string", () => {
    expect(normalizeApiError(400, { error: "Bad input" }, FB).message).toBe("Bad input");
    expect(normalizeApiError(400, { message: "Bad msg" }, FB).message).toBe("Bad msg");
  });

  it("falls back for empty, non-string, or non-object payloads", () => {
    for (const p of [{ error: "  " }, { error: 5 }, "text", undefined, [], { error: { code: "X" } }]) {
      expect(normalizeApiError(400, p, FB).message).toBe(FB);
    }
  });

  it.each(["SQLSTATE 23505", "at Object.<anonymous> (file.js:1)", "postgres://u:p@host/db", "duplicate key value violates unique constraint"])(
    "does not leak raw internal error %s", (raw) => {
      expect(normalizeApiError(500, { error: raw }, FB).message).toBe(FB);
    });

  it("parses retryAfterSeconds from payload, then header, for 429 only", () => {
    expect(normalizeApiError(429, { retryAfterSeconds: 12 }, FB, "30").retryAfterSeconds).toBe(12);
    expect(normalizeApiError(429, {}, FB, "30").retryAfterSeconds).toBe(30);
    expect(normalizeApiError(429, {}, FB, "abc").retryAfterSeconds).toBeUndefined();
    expect(normalizeApiError(429, { retryAfterSeconds: -3 }, FB, "0").retryAfterSeconds).toBeUndefined();
    expect(normalizeApiError(429, {}, FB, null)).not.toHaveProperty("retryAfterSeconds");
    expect(normalizeApiError(503, {}, FB, "30").retryAfterSeconds).toBeUndefined();
  });

  it("treats other 4xx as non-retryable validation-free fallback", () => {
    expect(normalizeApiError(418, null, FB)).toMatchObject({ kind: "validation", canRetry: false });
  });
});
