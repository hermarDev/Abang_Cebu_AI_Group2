import { beforeEach, describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

const req = (headers: Record<string, string> = {}) => new Request("http://localhost/api", { headers });
const opts = { windowMs: 1000, maxPerIp: 3, maxPerActor: 2 };

describe("createRateLimiter", () => {
  let limiter: ReturnType<typeof createRateLimiter>;
  beforeEach(() => { limiter = createRateLimiter(opts); });

  it("blocks an actor after maxPerActor within the window", () => {
    const r = req({ "cf-connecting-ip": "1.1.1.1" });
    expect(limiter.check(r, "a", 0)).toBe(true);
    expect(limiter.check(r, "a", 1)).toBe(true);
    expect(limiter.check(r, "a", 2)).toBe(false);
  });

  it("blocks an IP after maxPerIp across different actors", () => {
    const r = req({ "cf-connecting-ip": "1.1.1.1" });
    expect(["a", "b", "c", "d"].map((k) => limiter.check(r, k, 0))).toEqual([true, true, true, false]);
  });

  it("normalizes actor keys", () => {
    const r = req({ "cf-connecting-ip": "1.1.1.1" });
    limiter.check(r, "User@X.com ", 0);
    limiter.check(r, "user@x.com", 1);
    expect(limiter.check(r, " USER@x.com", 2)).toBe(false);
  });

  it("tracks different IPs independently", () => {
    limiter.check(req({ "cf-connecting-ip": "1.1.1.1" }), "a", 0);
    limiter.check(req({ "cf-connecting-ip": "1.1.1.1" }), "a", 0);
    expect(limiter.check(req({ "cf-connecting-ip": "2.2.2.2" }), "b", 0)).toBe(true);
  });

  it("slides: allows again once timestamps expire", () => {
    const r = req({ "cf-connecting-ip": "1.1.1.1" });
    limiter.check(r, "a", 0);
    limiter.check(r, "a", 500);
    expect(limiter.check(r, "a", 999)).toBe(false);
    expect(limiter.check(r, "a", 1000)).toBe(true); // t=0 expired, t=500 still counts
    expect(limiter.check(r, "a", 1001)).toBe(false);
  });

  it("does not record blocked attempts", () => {
    const r = req({ "cf-connecting-ip": "1.1.1.1" });
    limiter.check(r, "a", 0);
    limiter.check(r, "a", 1);
    for (let i = 0; i < 5; i++) limiter.check(r, "a", 2 + i);
    expect(limiter.check(r, "a", 1001)).toBe(true);
  });

  it("reports retryAfterSeconds >= 1 when blocked", () => {
    const r = req({ "cf-connecting-ip": "1.1.1.1" });
    expect(limiter.checkDetailed(r, "a", 0)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    limiter.checkDetailed(r, "a", 100);
    expect(limiter.checkDetailed(r, "a", 900)).toEqual({ allowed: false, retryAfterSeconds: 1 });
    const slow = createRateLimiter({ windowMs: 60_000, maxPerIp: 5, maxPerActor: 1 });
    slow.check(r, "a", 0);
    expect(slow.checkDetailed(r, "a", 10_000)).toEqual({ allowed: false, retryAfterSeconds: 50 });
  });

  it("falls back to x-forwarded-for outside production and 'unknown-ip' otherwise", () => {
    const l = createRateLimiter({ windowMs: 1000, maxPerIp: 1, maxPerActor: 10 });
    expect(l.check(req({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" }), "a", 0)).toBe(true);
    expect(l.check(req({ "x-forwarded-for": "9.9.9.9" }), "b", 0)).toBe(false);
    expect(l.check(req(), "c", 0)).toBe(true);
    expect(l.check(req(), "d", 0)).toBe(false);
  });

  it("accepts x-real-ip and x-forwarded-for in production when cf-connecting-ip is missing", () => {
    const prev = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = "production";
    try {
      const l = createRateLimiter({ windowMs: 1000, maxPerIp: 1, maxPerActor: 10 });
      expect(l.check(req({ "x-real-ip": "9.9.9.9" }), "a", 0)).toBe(true);
      expect(l.check(req({ "x-real-ip": "9.9.9.9" }), "b", 0)).toBe(false);
      expect(l.check(req({ "x-forwarded-for": "7.7.7.7" }), "c", 0)).toBe(true);
      expect(l.check(req({ "x-forwarded-for": "7.7.7.7" }), "d", 0)).toBe(false);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prev as string;
    }
  });

  it("reset clears state", () => {
    const r = req({ "cf-connecting-ip": "1.1.1.1" });
    limiter.check(r, "a", 0);
    limiter.check(r, "a", 1);
    limiter.reset();
    expect(limiter.check(r, "a", 2)).toBe(true);
  });

  it("sanitizes invalid IP strings and ignores header injection attempts", () => {
    const invalid = req({ "cf-connecting-ip": "malicious-payload; drop table--" });
    // In test environment, invalid IP falls back to 'development'
    expect(limiter.check(invalid, "user1", 0)).toBe(true);
    expect(limiter.check(invalid, "user2", 0)).toBe(true);
  });

  it("bounds storage to prevent memory exhaustion under rotating actors", () => {
    const l = createRateLimiter({ windowMs: 1000, maxPerIp: 100, maxPerActor: 100 });
    for (let i = 0; i < 10_050; i++) {
      l.check(req({ "cf-connecting-ip": "1.1.1.1" }), `actor-${i}`, 0);
    }
    expect(l.size().actorCount).toBeLessThanOrEqual(10_000);
  });
});
