import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export const BubbleGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col gap-1 w-full", className)} {...props}>
        {children}
      </div>
    );
  }
);
BubbleGroup.displayName = "BubbleGroup";

export interface BubbleProps extends HTMLAttributes<HTMLDivElement> {
  mine?: boolean;
}

export const Bubble = forwardRef<HTMLDivElement, BubbleProps>(
  ({ className, mine = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-mine={mine ? "true" : "false"}
        className={cn(
          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          mine
            ? "bg-action text-action-foreground rounded-br-xs"
            : "bg-muted text-foreground rounded-bl-xs",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Bubble.displayName = "Bubble";

export const BubbleContent = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <p ref={ref} className={cn("whitespace-pre-wrap break-words m-0", className)} {...props}>
        {children}
      </p>
    );
  }
);
BubbleContent.displayName = "BubbleContent";
