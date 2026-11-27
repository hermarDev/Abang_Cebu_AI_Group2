"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";

/**
 * Keeps the finder map shell mounted underneath intercepted sidebar subpages
 * so returning to `/` or `/map` reveals the existing WebGL context instantly.
 */
export function FinderOverlayHost({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay: React.ReactNode;
}) {
  const pathname = usePathname();
  const overlaySegment = useSelectedLayoutSegment("overlay");
  const hasOverlay =
    pathname !== "/" &&
    pathname !== "/map" &&
    Boolean(overlaySegment) &&
    overlaySegment !== "__PAGE__" &&
    overlaySegment !== "__DEFAULT__" &&
    overlaySegment !== "map";
  const overlayRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const wasOverlayRef = useRef(false);

  useEffect(() => {
    if (hasOverlay) {
      if (overlayRef.current) {
        overlayRef.current.scrollTop = 0;
        const active = document.activeElement;
        if (!active || active === document.body || backgroundRef.current?.contains(active)) {
          overlayRef.current.focus({ preventScroll: true });
        }
      }
      wasOverlayRef.current = true;
      return;
    }

    if (wasOverlayRef.current) {
      wasOverlayRef.current = false;
      const active = document.activeElement;
      if (!active || active === document.body) {
        document.querySelector<HTMLButtonElement>('button[aria-controls="finder-navigation"]')?.focus({ preventScroll: true });
      }
    }
  }, [hasOverlay, overlaySegment]);

  return (
    <>
      <div
        ref={backgroundRef}
        inert={hasOverlay ? true : undefined}
        aria-hidden={hasOverlay || undefined}
        className={hasOverlay ? "relative z-0 pointer-events-none" : "relative z-0"}
      >
        {children}
      </div>
      {hasOverlay ? (
        <div
          ref={overlayRef}
          tabIndex={-1}
          data-finder-overlay={overlaySegment}
          className="fixed inset-0 z-[45] overflow-y-auto bg-background outline-none"
        >
          {overlay}
        </div>
      ) : null}
    </>
  );
}
