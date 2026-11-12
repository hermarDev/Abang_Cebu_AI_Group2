"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useNotificationCenter } from "./useNotificationCenter";

export interface NotificationBellProps {
  userId?: string | null;
  className?: string;
}

/**
 * Bell entry point that links straight to the /notifications hub.
 * Unread badge is the only preview surface; no flyout/modal.
 */
export function NotificationBell({ userId, className }: NotificationBellProps) {
  const { unreadCount } = useNotificationCenter(userId, Boolean(userId));

  if (!userId) return null;

  return (
    <Link
      href="/notifications"
      aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-full bg-muted/80 text-foreground border border-border/80 transition-all hover:bg-muted hover:border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      <Bell size={18} aria-hidden="true" />
      {unreadCount > 0 && (
        <span
          className="absolute -bottom-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background"
          aria-hidden="true"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
