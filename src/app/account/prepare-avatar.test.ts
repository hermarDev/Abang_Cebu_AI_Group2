import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareAvatar } from "./prepare-avatar";

const sourceFile = new File(["source"], "input.png", { type: "image/png" });

function mockAvatarEncoder(responses: Array<Blob | null>) {
  const image = { width: 128, height: 128, close: vi.fn() };
  const context = { drawImage: vi.fn() };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: BlobCallback) => callback(responses.shift() ?? null)),
  };
  vi.stubGlobal("createImageBitmap", vi.fn(async () => image));
  vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
  return { canvas, image };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("prepareAvatar", () => {
  it("keeps the WebP MIME type and extension when WebP encoding is supported", async () => {
    mockAvatarEncoder([new Blob(["webp"], { type: "image/webp" })]);

    const result = await prepareAvatar(sourceFile);

    expect(result.type).toBe("image/webp");
    expect(result.name).toBe("profile-photo.webp");
  });

  it("preserves the PNG fallback MIME type and extension when WebP is unsupported", async () => {
    mockAvatarEncoder([new Blob(["png"], { type: "image/png" })]);

    const result = await prepareAvatar(sourceFile);

    expect(result.type).toBe("image/png");
    expect(result.name).toBe("profile-photo.png");
  });

  it("rejects a canvas result with an unsupported MIME type", async () => {
    const { canvas } = mockAvatarEncoder([new Blob(["text"], { type: "text/plain" })]);

    await expect(prepareAvatar(sourceFile)).rejects.toThrow();
    expect(canvas.toBlob).toHaveBeenCalledTimes(1);
  });

  it("rejects when the canvas cannot produce a blob", async () => {
    const { canvas } = mockAvatarEncoder(Array(9).fill(null));

    await expect(prepareAvatar(sourceFile)).rejects.toThrow();
    expect(canvas.toBlob).toHaveBeenCalledTimes(9);
  });

  it("keeps retrying smaller encodes until output meets the 2 MiB limit", async () => {
    const oversizedPng = new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: "image/png" });
    const allowedPng = new Blob(["within limit"], { type: "image/png" });
    const { canvas } = mockAvatarEncoder([oversizedPng, allowedPng]);

    const result = await prepareAvatar(sourceFile);

    expect(canvas.toBlob).toHaveBeenCalledTimes(2);
    expect(result.size).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(result.type).toBe("image/png");
    expect(result.name).toBe("profile-photo.png");
  });

  it("rejects output that remains above the 2 MiB limit", async () => {
    const oversizedPng = new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: "image/png" });
    const { canvas } = mockAvatarEncoder(Array(9).fill(oversizedPng));

    await expect(prepareAvatar(sourceFile)).rejects.toThrow();
    expect(canvas.toBlob).toHaveBeenCalledTimes(9);
  });
});