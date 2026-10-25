import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type AlertProps = HTMLAttributes<HTMLDivElement>;

export function Alert({ className, ...props }: AlertProps) {
  return <div {...props} data-slot="alert" role="alert" className={cn("rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground", className)} />;
}
