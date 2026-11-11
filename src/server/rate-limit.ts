type Options = { windowMs: number; maxPerIp: number; maxPerActor: number };

const MAX_TRACKED_KEYS = 10_000;
const IPV4_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_REGEX = /^[0-9a-fA-F:]+$/;

export function sanitizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (IPV4_REGEX.test(trimmed) || IPV6_REGEX.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function getClientIp(request: Request): string | null {
  const cf = sanitizeIp(request.headers.get("cf-connecting-ip"));
  const real = sanitizeIp(request.headers.get("x-real-ip"));
  const fwdRaw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const fwd = sanitizeIp(fwdRaw);

  const ip = cf || real || fwd;
  if (ip) return ip;
  return process.env.NODE_ENV !== "production" ? "development" : null;
}

// shortcut: process-local state, so limits are per instance; use shared storage for multi-instance deployments.
export function createRateLimiter({ windowMs, maxPerIp, maxPerActor }: Options) {
  const byIp = new Map<string, number[]>();
  const byActor = new Map<string, number[]>();

  const clientIp = (request: Request) => getClientIp(request) || "unknown-ip";

  const setBounded = (store: Map<string, number[]>, key: string, values: number[]) => {
    if (store.size >= MAX_TRACKED_KEYS && !store.has(key)) {
      const oldestKey = store.keys().next().value;
      if (oldestKey !== undefined) store.delete(oldestKey);
    }
    store.set(key, values);
  };

  const recent = (store: Map<string, number[]>, key: string, now: number) => {
    const existing = store.get(key);
    if (!existing) return [];
    const live = existing.filter((t) => now - t < windowMs);
    if (live.length) {
      store.set(key, live);
    } else {
      store.delete(key);
    }
    return live;
  };

  // Seconds until the oldest in-window hit expires, i.e. until the count drops below the limit.
  const wait = (live: number[], max: number, now: number) =>
    live.length >= max ? Math.max(1, Math.ceil((live[live.length - max] + windowMs - now) / 1000)) : 0;

  function checkDetailed(request: Request, actorKey: string, now = Date.now()) {
    const ip = clientIp(request);
    const actor = actorKey.trim().toLowerCase();
    const ipHits = recent(byIp, ip, now);
    const actorHits = recent(byActor, actor, now);
    const retryAfterSeconds = Math.max(wait(ipHits, maxPerIp, now), wait(actorHits, maxPerActor, now));
    if (retryAfterSeconds) return { allowed: false, retryAfterSeconds };
    setBounded(byIp, ip, [...ipHits, now]);
    setBounded(byActor, actor, [...actorHits, now]);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return {
    check: (request: Request, actorKey: string, now?: number) => checkDetailed(request, actorKey, now).allowed,
    checkDetailed,
    reset() { byIp.clear(); byActor.clear(); },
    size() { return { ipCount: byIp.size, actorCount: byActor.size }; },
  };
}
