import { describe, expect, it } from "vitest";
import { readBoundedJson } from "./bounded-body";

describe("readBoundedJson", () => {
  it("accepts a valid JSON body whose byte length equals maxBytes", async () => {
    const payload = JSON.stringify({ ok: true });
    const maxBytes = new TextEncoder().encode(payload).byteLength;
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    });

    const result = await readBoundedJson(request, maxBytes);
    expect(result).toEqual({ ok: true, data: { ok: true } });
  });

  it("rejects a streamed body over maxBytes without Content-Length", async () => {
    const chunk = new TextEncoder().encode("a".repeat(32));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
        controller.close();
      },
    });
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);

    const result = await readBoundedJson(request, 40);
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("rejects invalid UTF-8 bytes as invalid", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: new Uint8Array([0xff, 0xfe]),
    });

    const result = await readBoundedJson(request, 1024);
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects malformed JSON as invalid", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: "{not-json",
    });

    const result = await readBoundedJson(request, 1024);
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });
});
