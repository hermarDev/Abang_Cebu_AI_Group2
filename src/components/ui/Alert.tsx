import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type AlertVariant = "warning" | "error" | "success" | "info";
export type AlertProps = HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant };

const variantClasses: Record<AlertVariant, string> = {
  warning: "border-warning/40 bg-warning/10 text-foreground",
  error: "border-destructive/40 bg-destructive/10 text-foreground",
  success: "border-emerald-500/30 bg-emerald-500/10 text-foreground",
  info: "border-action/30 bg-action/10 text-foreground",
};

export function Alert({ className, variant = "warning", ...props }: AlertProps) {
  return <div {...props} data-slot="alert" data-variant={variant} role="alert" className={cn("rounded-lg border p-3 text-sm", variantClasses[variant], className)} />;
}
