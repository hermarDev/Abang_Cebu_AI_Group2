import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    secondary: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
    outline: "border border-zinc-200 text-zinc-800 dark:border-zinc-700 dark:text-zinc-300",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
