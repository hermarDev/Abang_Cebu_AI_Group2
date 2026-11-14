"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/components/ui/cn";
import { useNotificationCenter } from "./useNotificationCenter";
import { NotificationCenter } from "./NotificationCenter";
import type { UserRole } from "@/types/database";

export interface NotificationBellProps {
  userId?: string | null;
  userRole?: UserRole | null;
  className?: string;
}

export function NotificationBell({ userId, userRole, className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
  } = useNotificationCenter(userId, Boolean(userId));

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!userId) return null;

  const bellButton = (
    <button
      type="button"
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
    </button>
  );

  if (isMobile) {
    return (
      <>
        <div onClick={() => setOpen(true)} className="inline-block">
          {bellButton}
        </div>
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          side="bottom"
          title="Notifications"
          hideTitle
          className="p-0 max-h-[85dvh] rounded-t-2xl overflow-hidden"
        >
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            loading={loading}
            error={error}
            userRole={userRole}
            onRefresh={() => void refresh(true)}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onDeleteNotification={deleteNotification}
            onClearNotifications={clearNotifications}
            onClose={() => setOpen(false)}
          />
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{bellButton}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="p-0 w-80 sm:w-96 shadow-2xl">
        <NotificationCenter
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          error={error}
          userRole={userRole}
          onRefresh={() => void refresh(true)}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDeleteNotification={deleteNotification}
          onClearNotifications={clearNotifications}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}