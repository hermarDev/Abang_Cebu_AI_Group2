import { afterEach, describe, expect, it, vi } from "vitest";
import { createBoundedFetch } from "./fetch-timeout";

afterEach(() => vi.unstubAllGlobals());

describe("createBoundedFetch", () => {
  it("adds a timeout signal and honours a caller signal", async () => {
    const spy = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", spy);
    await createBoundedFetch(50)("https://x.test");
    expect((spy.mock.calls[0] as unknown as [string, RequestInit])[1].signal).toBeInstanceOf(AbortSignal);

    const caller = new AbortController();
    await createBoundedFetch(50)("https://x.test", { signal: caller.signal });
    const combined = (spy.mock.calls[1] as unknown as [string, RequestInit])[1].signal as AbortSignal;
    caller.abort();
    expect(combined.aborted).toBe(true);
  });

  it("aborts a stalled request after the timeout", async () => {
    vi.stubGlobal("fetch", (_: unknown, init: RequestInit) => new Promise((_res, rej) => init.signal!.addEventListener("abort", () => rej(init.signal!.reason))));
    await expect(createBoundedFetch(20)("https://x.test")).rejects.toMatchObject({ name: "TimeoutError" });
  });
});
