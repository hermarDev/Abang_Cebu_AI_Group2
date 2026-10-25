import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type EmptyProps = HTMLAttributes<HTMLDivElement>;

export function Empty({ className, ...props }: EmptyProps) {
  return <div data-slot="empty" className={cn("grid justify-items-center gap-2 rounded-lg border border-border bg-muted p-5 text-center text-card-foreground", className)} {...props} />;
}
