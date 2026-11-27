export const PORTFOLIO_CACHE_TTL_MS = 30_000;
export const PORTFOLIO_CACHE_LIMIT = 200;
export const SIGNED_URL_CACHE_TTL_MS = 60 * 60 * 1000;
export const SIGNED_URL_CACHE_LIMIT = 1000;

export const portfolioCache = new Map<string, { expires: number; data: unknown }>();
export const pendingPortfolio = new Map<string, Promise<unknown>>();
export const mapCache = new Map<string, { expires: number; data: unknown }>();
export const pendingMap = new Map<string, Promise<unknown>>();
export const signedUrlCache = new Map<string, { expires: number; url: string }>();

let cacheEpoch = 0;

export function getCacheEpoch(): number {
  return cacheEpoch;
}

export function isCacheDisabled(): boolean {
  return Boolean(process.env.VITEST);
}

export function boundedSet<K, V>(cache: Map<K, V>, key: K, value: V, limit: number): void {
  if (cache.size >= limit && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

/** Invalidate cached landlord portfolio and map data for a user (or all users). */
export function invalidateLandlordPortfolioCache(userId?: string): void {
  cacheEpoch += 1;
  if (userId) {
    portfolioCache.delete(userId);
    mapCache.delete(userId);
  } else {
    portfolioCache.clear();
    mapCache.clear();
  }
}
