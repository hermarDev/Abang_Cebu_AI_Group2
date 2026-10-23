"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

export type ToastVariant = "default" | "success" | "error";
export interface ToastProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: ToastVariant;
  duration?: number;
  className?: string;
}

const variants: Record<ToastVariant, string> = {
  default: "border-border bg-card text-card-foreground",
  success: "border-action bg-card text-card-foreground",
  error: "border-destructive bg-card text-card-foreground",
};

export function Toast({ open, onClose, children, variant = "default", duration = 5000, className }: ToastProps) {
  const id = useId();

  useEffect(() => {
    if (!open || duration <= 0) return;
    const timeout = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timeout);
  }, [open, duration, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      id={id}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn("fixed bottom-4 right-4 z-50 max-w-sm rounded-[var(--radius)] border p-4 shadow-lg", variants[variant], className)}
    >
      {children}
    </div>,
    document.body,
  );
}
