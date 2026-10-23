"use client";

import { useEffect, useId, useRef, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

export interface ModalProps extends Omit<HTMLAttributes<HTMLDialogElement>, "title"> {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  surface?: "finder";
  children: ReactNode;
}

export function Modal({ open, onClose, title, description, children, className, surface, ...props }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      data-surface={surface}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg rounded-[var(--radius)] border border-border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      {...props}
    >
      <div className="p-6">
        <header className="mb-4 relative pr-12">
          <button type="button" aria-label="Close dialog" onClick={onClose} className="absolute right-0 top-0 min-h-11 min-w-11 rounded-lg text-current hover:bg-muted">×</button>
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </header>
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
