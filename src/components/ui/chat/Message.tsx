import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export interface MessageProps extends HTMLAttributes<HTMLLIElement> {
  mine?: boolean;
}

export const Message = forwardRef<HTMLLIElement, MessageProps>(
  ({ className, mine = false, children, ...props }, ref) => {
    return (
      <li
        ref={ref}
        data-mine={mine ? "true" : "false"}
        className={cn(
          "flex w-full gap-2 items-end",
          mine ? "justify-end" : "justify-start",
          className
        )}
        {...props}
      >
        {children}
      </li>
    );
  }
);
Message.displayName = "Message";

export const MessageAvatar = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("size-7 shrink-0 mb-1 overflow-hidden rounded-full", className)}
        aria-hidden="true"
        {...props}
      >
        {children}
      </div>
    );
  }
);
MessageAvatar.displayName = "MessageAvatar";

export const MessageContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { mine?: boolean }
>(({ className, mine = false, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-1 max-w-[85%] sm:max-w-[75%]",
        mine ? "items-end" : "items-start",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
MessageContent.displayName = "MessageContent";

export const MessageFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-1.5 text-[0.7rem] text-muted-foreground px-1 select-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MessageFooter.displayName = "MessageFooter";
