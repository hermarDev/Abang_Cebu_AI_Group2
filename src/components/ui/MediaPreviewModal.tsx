"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface MediaPreviewModalProps {
  open: boolean;
  onClose: () => void;
  url: string | null;
  title: string;
  mimeType?: string | null;
}

export function isSafeMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const { protocol } = new URL(trimmed);
    return protocol === "https:" || protocol === "http:" || protocol === "blob:";
  } catch {
    return false;
  }
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
  const activeUrl = open && url && isSafeMediaUrl(url) ? url : null;
  const pdf = activeUrl ? isPdfMedia(activeUrl, mimeType) : false;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageLoadFailed = Boolean(activeUrl && failedUrl === activeUrl);

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
          ) : imageLoadFailed ? (
            <p role="alert" className="m-0 py-8 text-center text-sm text-muted-foreground">
              Preview could not be loaded. The link may have expired or this file cannot be shown inline.
            </p>
          ) : (
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-lg bg-muted/40 p-2">
              {/* Signed/external media URLs cannot use Next's static image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeUrl}
                alt={title}
                onError={() => setFailedUrl(activeUrl)}
                className="max-h-[72vh] w-auto max-w-full rounded object-contain"
              />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Open / Download
            </a>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
