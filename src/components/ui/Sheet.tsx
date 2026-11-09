"use client";

import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./cn";

export interface SheetProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  side?: "right" | "bottom";
  closeControl?: ReactNode;
  footer?: ReactNode;
  hideTitle?: boolean;
  restoreTriggerFocus?: boolean;
  children: ReactNode;
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  side = "right",
  children,
  className,
  closeControl,
  footer,
  hideTitle = false,
  restoreTriggerFocus = true,
  ...props
}: SheetProps) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(open);

  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      triggerRef.current =
        typeof document !== "undefined" && document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }
    wasOpen.current = open;
  }, [open]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          data-slot="sheet-overlay"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        />
        <Dialog.Content
          data-slot="sheet-content"
          data-side={side}
          onCloseAutoFocus={(event) => {
            if (restoreTriggerFocus && triggerRef.current?.isConnected) {
              event.preventDefault();
              triggerRef.current.focus();
            }
          }}
          className={cn(
            "fixed z-50 flex flex-col bg-card text-card-foreground shadow-2xl transition-transform duration-300 ease-out focus-visible:outline-hidden",
            side === "right" &&
              "inset-y-0 right-0 h-full w-full max-w-full sm:max-w-md border-l border-border",
            side === "bottom" &&
              "inset-x-0 bottom-0 max-h-[90dvh] w-full border-t border-border rounded-t-2xl",
            className
          )}
          {...props}
        >
          <header className="flex items-center justify-between border-b border-border p-4">
            <div className="min-w-0 flex-1 pr-3">
              <Dialog.Title className={hideTitle ? "sr-only" : "text-base font-bold truncate"}>
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-xs text-muted-foreground truncate">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              {closeControl ?? (
                <button
                  type="button"
                  aria-label="Close panel"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              )}
            </Dialog.Close>
          </header>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
          {footer && (
            <footer className="shrink-0 border-t border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
