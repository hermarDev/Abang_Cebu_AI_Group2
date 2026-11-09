import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import type { createRateLimiter } from "@/server/rate-limit";

export const noStoreHeaders = { "Cache-Control": "no-store" };
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DRAFT_MEDIA_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f]{64}\.(?:jpg|png|webp)$/i;

export const reply = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...noStoreHeaders, ...extra } });

/** Auth + CSRF-style account binding + profile role check shared by every messaging route. */
export async function requireMessagingUser(request: Request, roles: readonly string[] = ["renter", "landlord"]) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { response: reply({ error: "Sign in to access messages." }, 401) } as const;
  if (request.headers.get("x-expected-user-id") !== user.id) {
    return { response: reply({ error: "Your account changed. Please refresh and try again." }, 409) } as const;
  }
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError) return { response: reply({ error: "Your account could not be checked. Please try again." }, 503) } as const;
  if (!profile || profile.is_suspended || !["renter", "landlord"].includes(profile.role)) {
    return { response: reply({ error: "Messaging is unavailable for this account." }, 403) } as const;
  }
  if (!roles.includes(profile.role)) {
    return { response: reply({ error: "Only renter accounts can start a listing inquiry." }, 403) } as const;
  }
  return { supabase, user } as const;
}

export function limited(limiter: ReturnType<typeof createRateLimiter>, request: Request, actor: string) {
  const { allowed, retryAfterSeconds } = limiter.checkDetailed(request, actor);
  if (allowed) return null;
  return reply({ error: "Too many messages. Please wait before trying again.", retryAfterSeconds }, 429, { "Retry-After": String(retryAfterSeconds) });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const validMessageBody = (body: unknown): body is string =>
  typeof body === "string" && body.trim().length >= 1 && body.trim().length <= 2000;
export const invalidMessage = () => reply({ error: "Enter a message between 1 and 2,000 characters." }, 400);

export function rpcFailure(code: string | undefined, map: Record<string, number>) {
  const status = (code && map[code]) || 503;
  const error = status === 503 ? "Messaging is temporarily unavailable. Please try again." : status === 403 ? "You can't do that in this conversation." : status === 404 ? "Conversation or listing not found." : status === 409 ? "That request was already used. Please try again." : "That request was not valid.";
  return reply({ error }, status);
}

type Thread = Record<string, unknown> & { listingPhotoPath?: unknown; counterpart?: Record<string, unknown> & { id?: string; avatarUrl?: unknown } };

/** Signs listing thumbnails + counterpart avatars; strips raw paths and any contact fields. */
export async function enrichThreads(threads: Thread[]) {
  const paths = [...new Set(threads.map((t) => t.listingPhotoPath).filter((p): p is string => typeof p === "string" && DRAFT_MEDIA_PATH.test(p)))];
  const signed = new Map<string, string>();
  if (paths.length) {
    try {
      const { data } = await createAdminClient().storage.from("property-draft-media").createSignedUrls(paths, 3600);
      for (const e of data ?? []) if (e?.path && e.signedUrl && /^https?:\/\//i.test(e.signedUrl)) signed.set(e.path, e.signedUrl);
    } catch {
      // Degrade to no thumbnail if signing fails.
    }
  }
  return Promise.all(threads.map(async (t) => {
    const { listingPhotoPath, counterpart, ...rest } = t;
    const photo = typeof listingPhotoPath === "string" ? listingPhotoPath : null;
    const { email: _e, phone_number: _p, phoneNumber: _n, phone: _ph, avatarUrl, ...safeCounterpart } = counterpart ?? {};
    void _e; void _p; void _n; void _ph;
    const signedPhoto = photo && /^https:\/\//i.test(photo) ? photo : photo ? (signed.get(photo) ?? null) : null;
    return {
      ...rest,
      listingThumbnailUrl: signedPhoto,
      listingPhotoUrl: signedPhoto,
      counterpart: { ...safeCounterpart, avatarUrl: typeof counterpart?.id === "string" ? await signProfileAvatar(counterpart.id, typeof avatarUrl === "string" ? avatarUrl : null) : null },
    };
  }));
}
