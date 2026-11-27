import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./Modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
}));

import { isPdfMedia, isSafeMediaUrl, MediaPreviewModal } from "./MediaPreviewModal";

describe("MediaPreviewModal", () => {
  it("detects PDF URLs and MIME types", () => {
    expect(isPdfMedia("https://example.supabase.co/storage/v1/object/sign/permits/doc.pdf?token=abc")).toBe(true);
    expect(isPdfMedia("https://example.supabase.co/storage/v1/object/sign/permits/file", "application/pdf")).toBe(true);
    expect(isPdfMedia("https://example.supabase.co/storage/v1/object/sign/photos/room.jpg", "image/jpeg")).toBe(false);
  });

  it("validates safe media URLs", () => {
    expect(isSafeMediaUrl("https://example.supabase.co/storage/v1/object/sign/permits/doc.pdf")).toBe(true);
    expect(isSafeMediaUrl("http://127.0.0.1:54321/storage/v1/object/sign/permits/doc.pdf")).toBe(true);
    expect(isSafeMediaUrl("blob:https://abangcebu.tech/123")).toBe(true);
    expect(isSafeMediaUrl("/api/file")).toBe(true);
    expect(isSafeMediaUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeMediaUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeMediaUrl("//evil.test/x")).toBe(false);
    expect(isSafeMediaUrl("")).toBe(false);
  });

  it("renders nothing when closed, url is null, or url is unsafe", () => {
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
    expect(
      renderToStaticMarkup(
        <MediaPreviewModal open={true} onClose={vi.fn()} url="javascript:alert(1)" title="Photo" />,
      ),
    ).toBe("");
  });

  it("renders an iframe and fallback link for PDF URLs when open", () => {
    const pdfUrl = "https://example.supabase.co/storage/v1/object/sign/permits/doc.pdf?token=abc";
    const html = renderToStaticMarkup(
      <MediaPreviewModal open={true} onClose={vi.fn()} url={pdfUrl} title="Permit 1" />,
    );
    expect(html).toContain("<iframe");
    expect(html).toContain('src="https://example.supabase.co/storage/v1/object/sign/permits/doc.pdf?token=abc"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Open / Download");
  });

  it("renders an image and fallback link for image URLs when open", () => {
    const imgUrl = "https://example.supabase.co/storage/v1/object/sign/photos/room.jpg";
    const html = renderToStaticMarkup(
      <MediaPreviewModal open={true} onClose={vi.fn()} url={imgUrl} title="Photo 1" />,
    );
    expect(html).toContain("<img");
    expect(html).toContain(`src="${imgUrl}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Open / Download");
  });
});
