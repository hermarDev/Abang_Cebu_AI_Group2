"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
  type UIEvent,
} from "react";
import { cn } from "@/components/ui/cn";

export interface MessageScrollerHandle {
  scrollToBottom: (smooth?: boolean) => void;
  isAtBottom: () => boolean;
  element: HTMLDivElement | null;
}

export interface MessageScrollerProps extends HTMLAttributes<HTMLDivElement> {
  onScrollBottomChange?: (atBottom: boolean) => void;
}

export const MessageScroller = forwardRef<MessageScrollerHandle, MessageScrollerProps>(
  ({ className, children, onScroll, onScrollBottomChange, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const atBottomRef = useRef(true);

    useImperativeHandle(ref, () => ({
      scrollToBottom: (smooth = false) => {
        const el = internalRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
        atBottomRef.current = true;
        onScrollBottomChange?.(true);
      },
      isAtBottom: () => atBottomRef.current,
      element: internalRef.current,
    }));

    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (atBottomRef.current !== atBottom) {
        atBottomRef.current = atBottom;
        onScrollBottomChange?.(atBottom);
      }
      onScroll?.(e);
    };

    return (
      <div
        ref={internalRef}
        onScroll={handleScroll}
        className={cn("min-h-0 flex-1 overflow-y-auto", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MessageScroller.displayName = "MessageScroller";
