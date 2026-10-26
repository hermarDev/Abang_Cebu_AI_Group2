"use client";

import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "./cn";

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  surface?: "finder";
  closeControl?: ReactNode;
  hideTitle?: boolean;
  restoreTriggerFocus?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
}

export function Modal({ open, onClose, title, description, children, className, surface, closeControl, hideTitle = false, restoreTriggerFocus = true, onCloseAutoFocus, ...props }: ModalProps) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(open);
  useLayoutEffect(() => {
    if (open && !wasOpen.current) triggerRef.current = typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null;
    wasOpen.current = open;
  }, [open]);
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose();
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-index-modal-backdrop)] bg-foreground/50" />
        <Dialog.Content
          data-surface={surface}
          data-slot="dialog-content"
          onCloseAutoFocus={(event) => {
            if (restoreTriggerFocus && triggerRef.current?.isConnected) {
              event.preventDefault();
              triggerRef.current.focus();
            } else {
              onCloseAutoFocus?.(event);
            }
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-[var(--z-index-modal)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            className,
          )}
          {...props}
        >
          <div className="p-6">
            <header className="mb-4 relative pr-12">
              <Dialog.Close asChild>
                {closeControl ?? <button type="button" aria-label="Close dialog" className="absolute right-0 top-0 min-h-11 min-w-11 rounded-lg text-current hover:bg-muted">×</button>}
              </Dialog.Close>
              <Dialog.Title className={hideTitle ? "sr-only" : "text-lg font-semibold"}>{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>}
            </header>
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
