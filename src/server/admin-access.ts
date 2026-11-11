import { createClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/server/rate-limit";

export const noStoreHeaders = { "Cache-Control": "no-store" };
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const reply = (error: string, status: number) => Response.json({ error }, { status, headers: noStoreHeaders });
const limiterOptions = { windowMs: 5 * 60_000, maxPerIp: 60, maxPerActor: 60 };
export const adminLifecycleLimiter = createRateLimiter(limiterOptions);
export const adminAccountsLimiter = createRateLimiter(limiterOptions);
export const adminReportsLimiter = createRateLimiter(limiterOptions);

export async function requireActiveAdmin(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: reply("Sign in with an admin account to continue.", 401) } as const;
  if (request.headers.get("x-expected-user-id") !== user.id) return { response: reply("Your account changed. Please refresh and try again.", 409) } as const;
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError) return { response: reply("Your account could not be checked. Please try again.", 503) } as const;
  if (profile?.role !== "admin" || profile.is_suspended) return { response: reply("Admin workspace access is restricted to active administrators.", 403) } as const;
  return { supabase, user } as const;
}

type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };
type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<RpcResult>;

export type KnownAdminRpc =
  | "admin_list_properties"
  | "admin_update_property_location"
  | "admin_dashboard_overview"
  | "admin_list_audit_logs"
  | "admin_list_abuse_reports"
  | "admin_get_abuse_report_detail"
  | "admin_resolve_abuse_report"
  | "review_property";

// Safely typed RPC call with client interface validation; a rejected call becomes an error result.
export async function adminRpc(
  supabase: unknown,
  fn: KnownAdminRpc | (string & {}),
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

export const jsonOk = (body: unknown) => Response.json(body, { headers: noStoreHeaders });
export const jsonError = reply;

// limit 1..100 (default 50), offset >= 0 (default 0); null when malformed.
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

export function rateLimited(limiter: typeof adminLifecycleLimiter, request: Request, actor: string) {
  const { allowed, retryAfterSeconds } = limiter.checkDetailed(request, actor);
  if (allowed) return null;
  return Response.json(
    { error: "Too many admin actions. Please wait before trying again.", retryAfterSeconds },
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
export const validUuid = (value: unknown): value is string => typeof value === "string" && uuidPattern.test(value);
