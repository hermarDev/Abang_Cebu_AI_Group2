export function inspectDraftMedia(kind: "photo" | "permit", mime: string, bytes: Uint8Array): string | null {
  if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) return null;
  const starts = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  const png = starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpeg = starts([0xff, 0xd8, 0xff]);
  const webp = starts([0x52, 0x49, 0x46, 0x46]) && bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  const pdf = starts([0x25, 0x50, 0x44, 0x46, 0x2d]);
  if ((mime === "image/png" && png) || (mime === "image/jpeg" && jpeg) ||
      (kind === "photo" && mime === "image/webp" && webp) ||
      (kind === "permit" && mime === "application/pdf" && pdf)) return mime;
  return null;
}
