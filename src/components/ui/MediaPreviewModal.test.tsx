import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { isPdfMedia, MediaPreviewModal } from "./MediaPreviewModal";

describe("MediaPreviewModal", () => {
  it("detects PDF URLs and MIME types", () => {
    expect(isPdfMedia("https://example.supabase.co/storage/v1/object/sign/permits/doc.pdf?token=abc")).toBe(true);
    expect(isPdfMedia("https://example.supabase.co/storage/v1/object/sign/permits/file", "application/pdf")).toBe(true);
    expect(isPdfMedia("https://example.supabase.co/storage/v1/object/sign/photos/room.jpg", "image/jpeg")).toBe(false);
  });

  it("renders nothing when closed or url is null", () => {
    expect(
      renderToStaticMarkup(
        <MediaPreviewModal open={false} onClose={vi.fn()} url="https://x.test/a.jpg" title="Photo" />,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <MediaPreviewModal open={true} onClose={vi.fn()} url={null} title="Photo" />,
      ),
    ).toBe("");
  });
});
