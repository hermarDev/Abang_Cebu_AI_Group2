import { createClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/server/rate-limit";

export const noStoreHeaders = { "Cache-Control": "no-store" };
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const reply = (error: string, status: number) => Response.json({ error }, { status, headers: noStoreHeaders });
const limiterOptions = { windowMs: 5 * 60_000, maxPerIp: 60, maxPerActor: 60 };
export const verificationLimiter = createRateLimiter(limiterOptions);

export async function requireActiveVerifier(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: reply("Sign in with a verification officer or admin account to continue.", 401) } as const;
  if (request.headers.get("x-expected-user-id") !== user.id) return { response: reply("Your account changed. Please refresh and try again.", 409) } as const;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return { response: reply("Your account could not be checked. Please try again.", 503) } as const;
  if (!profile || (profile.role !== "verification_officer" && profile.role !== "admin") || profile.is_suspended) {
    return { response: reply("Field verification workspace is restricted to active field verification officers and administrators.", 403) } as const;
  }
  return { supabase, user, profile } as const;
}

type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };
type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<RpcResult>;

export async function verifierRpc(
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

export const jsonOk = (body: unknown) => Response.json(body, { headers: noStoreHeaders });
export const jsonError = reply;

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

export function rateLimited(limiter: typeof verificationLimiter, request: Request, actor: string) {
  const { allowed, retryAfterSeconds } = limiter.checkDetailed(request, actor);
  if (allowed) return null;
  return Response.json(
    { error: "Too many actions. Please wait before trying again.", retryAfterSeconds },
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

export const isUuid = (value: unknown): value is string => typeof value === "string" && uuidPattern.test(value);
export const isValidVerificationMethod = (val: unknown): val is "site_visit" | "video_call" | "proxy_meeting" =>
  typeof val === "string" && ["site_visit", "video_call", "proxy_meeting"].includes(val);
export const isValidVerificationStatus = (val: unknown): val is "verified" | "flagged" =>
  typeof val === "string" && ["verified", "flagged"].includes(val);
export const isValidNotes = (val: unknown): val is string =>
  typeof val === "string" && val.trim().length >= 5 && val.trim().length <= 2000;
