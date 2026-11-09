import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export const Marker = forwardRef<HTMLLIElement, HTMLAttributes<HTMLLIElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn("flex items-center justify-center my-3 w-full select-none list-none", className)}
        {...props}
      >
        {children}
      </li>
    );
  }
);
Marker.displayName = "Marker";

export const MarkerContent = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-border bg-muted/80 px-2.5 py-0.5 text-[0.65rem] font-medium tracking-wide text-muted-foreground shadow-xs",
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
MarkerContent.displayName = "MarkerContent";
