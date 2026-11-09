export type ApiErrorKind = "validation" | "unauthenticated" | "forbidden" | "not_found" | "conflict" | "rate_limit" | "network" | "server";
export type NormalizedApiError = { kind: ApiErrorKind; message: string; retryAfterSeconds?: number; canRetry: boolean };

const UNSAFE = /SQLSTATE|\bat\s+\S+\s*\(|\bat Object\.|\bat async\b|postgres(ql)?:\/\/|duplicate key value|violates .* constraint|node_modules/i;

function safeMessage(payload: unknown, fallback: string) {
  const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  for (const value of [body.error, body.message]) {
    if (typeof value === "string" && value.trim() && !UNSAFE.test(value)) return value.trim();
  }
  return fallback;
}

function positiveInt(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export function normalizeApiError(status: number, payload: unknown, fallbackMessage: string, retryAfterHeader?: string | null): NormalizedApiError {
  const message = safeMessage(payload, fallbackMessage);
  if (status === 0) return { kind: "network", message, canRetry: true };
  if (status === 401) return { kind: "unauthenticated", message, canRetry: false };
  if (status === 403) return { kind: "forbidden", message, canRetry: false };
  if (status === 404) return { kind: "not_found", message, canRetry: false };
  if (status === 409) return { kind: "conflict", message, canRetry: false };
  if (status === 429) {
    const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const retryAfterSeconds = positiveInt(body.retryAfterSeconds) ?? positiveInt(retryAfterHeader);
    return { kind: "rate_limit", message, canRetry: true, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) };
  }
  if (status >= 500) return { kind: "server", message, canRetry: true };
  return { kind: "validation", message, canRetry: false }; // 400, 422 and any other 4xx
}
