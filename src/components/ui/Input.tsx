import type { InputHTMLAttributes } from "react";
import styles from "./primitives.module.css";
import { cn } from "./cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { appearance?: "default" | "embedded" };

export function Input({ appearance = "default", className, type = "text", "aria-invalid": ariaInvalid, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      aria-invalid={ariaInvalid}
      className={cn(
        styles.control,
        appearance === "embedded" && styles.embedded,
        "min-h-11 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
