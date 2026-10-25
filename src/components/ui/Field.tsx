import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type FieldProps = HTMLAttributes<HTMLDivElement>;
export type FieldErrorProps = HTMLAttributes<HTMLParagraphElement>;

export function Field({ className, ...props }: FieldProps) {
  return <div data-slot="field" className={cn("grid gap-2", className)} {...props} />;
}

export function FieldError({ className, ...props }: FieldErrorProps) {
  return <p data-slot="field-error" className={cn("text-sm text-destructive", className)} {...props} />;
}
