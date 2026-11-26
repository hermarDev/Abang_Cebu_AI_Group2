"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";

export interface MediaPreviewModalProps {
  open: boolean;
  onClose: () => void;
  url: string | null;
  title: string;
  mimeType?: string | null;
}

export function isPdfMedia(url: string, mimeType?: string | null): boolean {
  if (mimeType && mimeType.toLowerCase().includes("pdf")) return true;
  try {
    return new URL(url, "https://example.invalid").pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return url.toLowerCase().includes(".pdf");
  }
}

export function MediaPreviewModal({ open, onClose, url, title, mimeType }: MediaPreviewModalProps) {
  const activeUrl = open && url ? url : null;
  const pdf = activeUrl ? isPdfMedia(activeUrl, mimeType) : false;

  return (
    <Modal open={Boolean(activeUrl)} onClose={onClose} title={title} className="max-w-4xl">
      {activeUrl && (
        <div className="grid gap-3">
          {pdf ? (
            <iframe
              src={activeUrl}
              title={title}
              className="h-[75vh] w-full rounded-lg border border-border bg-white"
            />
          ) : (
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-lg bg-muted/40 p-2">
              {/* Signed/external media URLs cannot use Next's static image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeUrl}
                alt={title}
                className="max-h-[72vh] w-auto max-w-full rounded object-contain"
              />
            </div>
          )}
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
