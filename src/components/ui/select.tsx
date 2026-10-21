import { useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function Select({
  id: providedId,
  label,
  helperText,
  error,
  className,
  disabled,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = `${id}-description`;
  const description = error ?? helperText;
  const describedBy = [props["aria-describedby"], description ? descriptionId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <select
        {...props}
        id={id}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "focus-ring touch-target w-full rounded-md border border-input bg-card px-3 py-2 text-base text-card-foreground disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive",
          className,
        )}
      >
        {children}
      </select>
      {description ? (
        <p id={descriptionId} className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
