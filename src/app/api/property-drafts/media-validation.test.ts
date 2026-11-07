import { describe, expect, it } from "vitest";
import { inspectDraftMedia } from "./media-validation";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pdf = new TextEncoder().encode("%PDF-1.7\n");
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);
const webp = new TextEncoder().encode("RIFF\u0004\u0000\u0000\u0000WEBP");

describe("draft media bytes", () => {
  it("recognizes only allowed type and matching declared MIME", () => {
    expect(inspectDraftMedia("photo", "image/png", png)).toBe("image/png");
    expect(inspectDraftMedia("photo", "image/jpeg", jpeg)).toBe("image/jpeg");
    expect(inspectDraftMedia("photo", "image/webp", webp)).toBe("image/webp");
    expect(inspectDraftMedia("permit", "application/pdf", pdf)).toBe("application/pdf");
    expect(inspectDraftMedia("photo", "application/pdf", pdf)).toBeNull();
    expect(inspectDraftMedia("permit", "image/webp", webp)).toBeNull();
    expect(inspectDraftMedia("photo", "image/jpeg", png)).toBeNull();
    expect(inspectDraftMedia("permit", "application/pdf", new TextEncoder().encode("not a pdf"))).toBeNull();
  });
  it("enforces the exact byte size boundary", () => {
    const maximum = new Uint8Array(10 * 1024 * 1024);
    maximum.set(png);
    expect(inspectDraftMedia("photo", "image/png", maximum)).toBe("image/png");
    const tooLarge = new Uint8Array(maximum.length + 1);
    tooLarge.set(png);
    expect(inspectDraftMedia("photo", "image/png", tooLarge)).toBeNull();
    expect(inspectDraftMedia("photo", "image/png", new Uint8Array())).toBeNull();
  });
});
