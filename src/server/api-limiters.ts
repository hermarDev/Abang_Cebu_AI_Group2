import { createRateLimiter } from "./rate-limit";

export const assistantLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxPerIp: 15,
  maxPerActor: 30,
});

export const blocksLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxPerIp: 20,
  maxPerActor: 20,
});

export const favoritesLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxPerIp: 60,
  maxPerActor: 30,
});

export const landlordSubmissionsLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxPerIp: 30,
  maxPerActor: 15,
});

export const placesSearchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxPerIp: 30,
  maxPerActor: 30,
});

export const propertyDraftsLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxPerIp: 60,
  maxPerActor: 30,
});

export const supportTicketsLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxPerIp: 5,
  maxPerActor: 8,
});
