type Options = { windowMs: number; maxPerIp: number; maxPerActor: number };

// shortcut: process-local state, so limits are per instance; use shared storage for multi-instance deployments.
export function createRateLimiter({ windowMs, maxPerIp, maxPerActor }: Options) {
  const byIp = new Map<string, number[]>();
  const byActor = new Map<string, number[]>();

  const clientIp = (request: Request) =>
    request.headers.get("cf-connecting-ip") ||
    (process.env.NODE_ENV !== "production" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : undefined) ||
    "unknown-ip";

  const recent = (store: Map<string, number[]>, key: string, now: number) => {
    const live = (store.get(key) ?? []).filter((t) => now - t < windowMs);
    if (live.length) store.set(key, live); else store.delete(key);
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
    byIp.set(ip, [...ipHits, now]);
    byActor.set(actor, [...actorHits, now]);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return {
    check: (request: Request, actorKey: string, now?: number) => checkDetailed(request, actorKey, now).allowed,
    checkDetailed,
    reset() { byIp.clear(); byActor.clear(); },
  };
}
