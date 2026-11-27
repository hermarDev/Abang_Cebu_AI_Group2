import { createClient } from "@/lib/supabase/server";
import type { createRateLimiter } from "@/server/rate-limit";

export const noStoreHeaders = { "Cache-Control": "no-store" };
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const jsonOk = (body: unknown) => Response.json(body, { headers: noStoreHeaders });
export const jsonError = (error: string, status: number) =>
  Response.json({ error }, { status, headers: noStoreHeaders });

export type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };
type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<RpcResult>;

export function createRoleGuard<const TRole extends string>(options: {
  allowedRoles: readonly TRole[];
  unauthenticatedMessage: string;
  forbiddenMessage: string;
}) {
  return async function requireActiveRole(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { response: jsonError(options.unauthenticatedMessage, 401) } as const;
    if (request.headers.get("x-expected-user-id") !== user.id) {
      return { response: jsonError("Your account changed. Please refresh and try again.", 409) } as const;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,is_suspended")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) return { response: jsonError("Your account could not be checked. Please try again.", 503) } as const;
    if (!profile || !(options.allowedRoles as readonly string[]).includes(profile.role) || profile.is_suspended) {
      return { response: jsonError(options.forbiddenMessage, 403) } as const;
    }
    return { supabase, user, profile, role: profile.role as TRole } as const;
  };
}

/** Safely typed RPC call with client interface validation; a rejected call becomes an error result. */
export async function callTypedRpc(
  supabase: unknown,
  fn: string,
  args?: Record<string, unknown>,
): Promise<RpcResult> {
  try {
    if (!supabase || typeof supabase !== "object" || !("rpc" in supabase) || typeof (supabase as { rpc?: unknown }).rpc !== "function") {
      return { data: null, error: { message: "Invalid RPC client instance" } };
    }
    return await (supabase as { rpc: Rpc }).rpc(fn, args);
  } catch {
    return { data: null, error: { message: "rpc failed" } };
  }
}

/** limit 1..100 (default 50), offset >= 0 (default 0); null when malformed. */
export function pageParams(params: URLSearchParams) {
  const num = (key: string, fallback: number, min: number, max: number) => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    return /^\d+$/.test(raw) && value >= min && value <= max ? value : null;
  };
  const limit = num("limit", 50, 1, 100);
  const offset = num("offset", 0, 0, Number.MAX_SAFE_INTEGER);
  return limit === null || offset === null ? null : { limit, offset };
}

export function checkRateLimit(
  limiter: ReturnType<typeof createRateLimiter>,
  request: Request,
  actor: string,
  message: string,
) {
  const { allowed, retryAfterSeconds } = limiter.checkDetailed(request, actor);
  if (allowed) return null;
  return Response.json(
    { error: message, retryAfterSeconds },
    { status: 429, headers: { ...noStoreHeaders, "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function readJsonObject(request: Request) {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const validReason = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length >= 5 && value.trim().length <= 1000;
export const validUuid = (value: unknown): value is string =>
  typeof value === "string" && uuidPattern.test(value);
