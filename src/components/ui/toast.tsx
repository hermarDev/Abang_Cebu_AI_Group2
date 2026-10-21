import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
  onDismiss?: () => void;
}

export function Toast({
  open,
  title,
  description,
  variant = "default",
  onDismiss,
  className,
  ...props
}: ToastProps) {
  if (!open) return null;

  const tone = {
    default: "border-border bg-popover text-popover-foreground",
    success: "border-action bg-card text-card-foreground",
    error: "border-destructive bg-card text-card-foreground",
  }[variant];

  return (
    <div
      {...props}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn("flex max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg", tone, className)}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
          className="focus-ring touch-target -mr-2 -mt-2 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m18 6-12 12M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export function ToastViewport({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-4 z-toast flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:w-auto",
        className,
      )}
    >
      <div
        className="pointer-events-auto flex flex-col items-end gap-2"
        role="region"
        aria-label="Notifications"
      >
        {children}
      </div>
    </div>
  );
}
