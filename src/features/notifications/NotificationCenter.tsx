"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Flag,
  Headset,
  Home,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Trash2,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { NotificationItem, NotificationType } from "@/types/database";
import styles from "./NotificationCenter.module.css";

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "message":
    case "inquiry":
      return <MessageSquare size={18} className="text-foreground" aria-hidden="true" />;
    case "listing_update":
    case "listing_review":
    case "listing_pending":
      return <Home size={18} className="text-foreground" aria-hidden="true" />;
    case "report":
      return <Flag size={18} className="text-destructive" aria-hidden="true" />;
    case "security":
      return <ShieldCheck size={18} className="text-action" aria-hidden="true" />;
    case "support":
      return <Headset size={18} className="text-action" aria-hidden="true" />;
    default:
      return <Bell size={18} className="text-foreground" aria-hidden="true" />;
  }
}

export interface NotificationCenterProps {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification?: (id: string) => void;
  onClearNotifications?: (scope: "read" | "all") => void;
  onClose?: () => void;
  className?: string;
  userRole?: "renter" | "landlord" | "admin" | null;
}

export function NotificationCenter({
  notifications,
  unreadCount,
  loading,
  error,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearNotifications,
  onClose,
  className,
  userRole,
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const router = useRouter();

  const filtered = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  const handleItemClick = (notification: NotificationItem) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    onClose?.();
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col max-h-[85vh] sm:max-h-[32rem] w-full overflow-hidden bg-card text-card-foreground",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-2.5 p-4 border-b border-border/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight">Notifications</h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onMarkAllAsRead}
                disabled={unreadCount === 0}
                className={cn(
                  "text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1",
                  unreadCount === 0 && "opacity-40 cursor-not-allowed hover:text-muted-foreground"
                )}
              >
                <CheckCheck size={14} aria-hidden="true" />
                Mark all read
              </button>
              {notifications.some((n) => n.is_read) && onClearNotifications && (
                <button
                  type="button"
                  onClick={() => onClearNotifications("read")}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <Trash2 size={13} aria-hidden="true" />
                  Clear read
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filter chips - visible only when notifications exist */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2" role="group" aria-label="Notification filters">
            <button
              type="button"
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filter === "all"
                  ? "bg-action text-action-foreground"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            <button
              type="button"
              aria-pressed={filter === "unread"}
              onClick={() => setFilter("unread")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
                filter === "unread"
                  ? "bg-action text-action-foreground"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-action-foreground/20 text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Notification List */}
      <div className={cn("flex-1 overflow-y-auto divide-y divide-border/40 min-h-[14rem]", styles.listContainer)}>
        {loading && notifications.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
            <AlertCircle size={24} className="text-destructive" />
            <p className="text-xs text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-action hover:underline"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center gap-2" role="status">
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Bell size={20} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium">
              {notifications.length === 0 ? "No notifications yet" : "You’re all caught up!"}
            </p>
            <p className="text-xs text-muted-foreground">
              {notifications.length === 0
                ? userRole === "landlord"
                  ? "New inquiries, renter messages, and listing reviews will appear here."
                  : userRole === "admin"
                  ? "New user reports, listing review submissions, and system alerts will appear here."
                  : "New landlord replies, inquiry updates, and rental alerts will appear here."
                : "You’ve read all your notifications."}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={cn(
                "w-full text-left p-3.5 flex items-start gap-3 transition-colors hover:bg-muted/40 relative group",
                !item.is_read && "bg-action/5"
              )}
            >
              <button
                type="button"
                onClick={() => handleItemClick(item)}
                className="flex items-start gap-3 flex-1 min-w-0 text-left focus-visible:outline-none"
              >
                <div className="w-9 h-9 rounded-full bg-muted/80 border border-border/80 flex items-center justify-center shrink-0 mt-0.5">
                  {getNotificationIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {item.body}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-2 shrink-0 self-center">
                {!item.is_read && (
                  <span
                    className="w-2 h-2 rounded-full bg-action shrink-0"
                    aria-label="Unread notification"
                  />
                )}
                {onDeleteNotification && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNotification(item.id);
                    }}
                    aria-label={`Dismiss notification: ${item.title}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted/80 transition-opacity"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer link to Hub */}
      <div className="p-2.5 border-t border-border/70 text-center bg-card shrink-0">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-xs font-semibold text-action hover:underline inline-flex items-center gap-1.5"
        >
          <span>View all notifications</span>
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
