export const REASON_MAX = 1000;

export type AdminCallResult<T> = { ok: true; data: T } | { ok: false; message: string };

export const newOperationId = () => crypto.randomUUID();

export function reasonProblem(reason: string, min: number) {
  const length = reason.trim().length;
  if (length < min) return min === 1 ? "Enter a reason." : `Enter at least ${min} characters.`;
  if (reason.length > REASON_MAX) return `Keep the reason under ${REASON_MAX + 1} characters.`;
  return null;
}

// Every admin call sends x-expected-user-id so a switched session is rejected server-side.
export async function adminCall<T>(url: string, userId: string, body?: unknown, signal?: AbortSignal): Promise<AdminCallResult<T>> {
  try {
    const response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      cache: "no-store",
      signal,
      headers: { "x-expected-user-id": userId, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json().catch(() => null) as { error?: unknown } | null;
    if (!response.ok) return { ok: false, message: typeof json?.error === "string" ? json.error : "The request failed. Please try again." };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, message: "Network error. Check your connection and try again." };
  }
}

export const formatAdminDate = (value: unknown) => {
  const date = typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }) : "—";
};