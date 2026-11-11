/** Bounds every Supabase request so a stalled socket cannot hang auth for 10s+ (undici default). */
export function createBoundedFetch(timeoutMs = 6_000): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal && typeof AbortSignal.any === "function" ? AbortSignal.any([init.signal, timeout]) : init?.signal ?? timeout;
    return fetch(input, { ...init, signal });
  };
}
