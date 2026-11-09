import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export const Marker = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        className={cn("flex items-center justify-center my-3 w-full select-none", className)}
        {...props}
      >
        {children}
      </div>
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
          "rounded-full bg-muted/80 px-2.5 py-0.5 text-[0.7rem] font-medium text-muted-foreground shadow-xs",
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
