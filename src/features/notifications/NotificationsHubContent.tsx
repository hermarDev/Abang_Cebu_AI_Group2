"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Flag,
  Headset,
  Home,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { notify } from "@/components/ui/AppToaster";
import { cn } from "@/components/ui/cn";
import { Pagination } from "@/components/ui/Pagination";
import type { NotificationItem, NotificationType, UserRole } from "@/types/database";
import { formatRelativeTime } from "./NotificationCenter";
import { fetchNotificationsClient, useNotificationCenter } from "./useNotificationCenter";
import styles from "./NotificationsHubContent.module.css";

export type NotificationTab = "all" | "unread" | "messages" | "listings" | "system";

export interface NotificationsHubContentProps {
  userId: string;
  userRole?: UserRole | null;
}

const PAGE_SIZE = 20;

const TAB_TYPES: Record<Exclude<NotificationTab, "all" | "unread">, string[]> = {
  messages: ["message", "inquiry"],
  listings: ["listing_update", "listing_review", "listing_pending"],
  system: ["report", "security", "support"],
};

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

export function NotificationsHubContent({ userId, userRole }: NotificationsHubContentProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotificationTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tabCounts, setTabCounts] = useState({
    all: 0,
    unread: 0,
    messages: 0,
    listings: 0,
    system: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const {
    unreadCount,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
  } = useNotificationCenter(userId, true);

  // Debounce search so each keystroke does not hit the API.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPage = useCallback(
    async (options: { tab: NotificationTab; search: string; page: number }) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);

      const types = options.tab === "all" || options.tab === "unread" ? undefined : TAB_TYPES[options.tab];
      const offset = (options.page - 1) * PAGE_SIZE;

      try {
        const payload = await fetchNotificationsClient(
          userId,
          false,
          fetch,
          controller.signal,
          {
            unreadOnly: options.tab === "unread",
            types,
            search: options.search || undefined,
            limit: PAGE_SIZE,
            offset,
            includeCounts: true,
          }
        );
        if (controller.signal.aborted) return;
        setItems(payload.notifications);
        setTotalCount(payload.totalCount);
        if (payload.tabCounts) setTabCounts(payload.tabCounts);
        setError(null);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load notifications");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    let cancelled = false;
    // Defer the first setState out of the effect body to avoid a cascading render.
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadPage({ tab: activeTab, search: debouncedSearch, page: currentPage });
    })();
    return () => {
      cancelled = true;
      requestRef.current?.abort();
    };
  }, [activeTab, debouncedSearch, currentPage, loadPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const visibleIds = useMemo(() => items.map((n) => n.id), [items]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const reload = useCallback(
    (tab: NotificationTab, search: string, page: number) => {
      void loadPage({ tab, search, page });
    },
    [loadPage]
  );

  const handleBulkMarkRead = async () => {
    if (selectedIds.length === 0) return;
    const targets = items.filter((n) => selectedIds.includes(n.id) && !n.is_read);
    await Promise.all(targets.map((n) => markAsRead(n.id)));
    notify(
      "success",
      "notifications-bulk-read",
      `Marked ${targets.length} notification${targets.length === 1 ? "" : "s"} as read.`
    );
    setSelectedIds([]);
    reload(activeTab, debouncedSearch, currentPage);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    await Promise.all(selectedIds.map((id) => deleteNotification(id)));
    notify(
      "success",
      "notifications-bulk-delete",
      `Deleted ${count} notification${count === 1 ? "" : "s"}.`
    );
    setSelectedIds([]);
    reload(activeTab, debouncedSearch, currentPage);
  };

  const handleClearRead = async () => {
    const success = await clearNotifications("read");
    if (success) {
      notify("success", "notifications-clear-read", "Cleared all read notifications.");
      setSelectedIds([]);
      reload(activeTab, debouncedSearch, currentPage);
    } else {
      notify("error", "notifications-clear-read-failed", "Could not clear read notifications.");
    }
  };

  const handleClearAll = async () => {
    const success = await clearNotifications("all");
    if (success) {
      notify("success", "notifications-clear-all", "Cleared all notifications.");
      setSelectedIds([]);
      setConfirmClearAll(false);
      reload(activeTab, debouncedSearch, currentPage);
    } else {
      notify("error", "notifications-clear-all-failed", "Could not clear notifications.");
    }
  };

  const handleItemClick = (notification: NotificationItem) => {
    if (!notification.is_read) {
      void markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleRefresh = async () => {
    await refresh(true);
    reload(activeTab, debouncedSearch, currentPage);
  };

  const backLink =
    userRole === "landlord"
      ? "/landlord/dashboard"
      : userRole === "admin"
        ? "/admin/dashboard"
        : userRole === "verification_officer"
          ? "/verification/dashboard"
          : userRole === "customer_support"
            ? "/support-desk/dashboard"
            : "/";

  return (
    <main className="min-h-[100dvh] bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className={styles.hubContainer}>
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href={backLink}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={18} />
              </Link>
              <BrandLogo className="h-7 w-auto" />
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Refresh notifications"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your alerts, inquiries, messages, and property updates.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void markAllAsRead().then(() => reload(activeTab, debouncedSearch, currentPage));
                }}
                disabled={unreadCount === 0}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors",
                  unreadCount === 0 && "opacity-40 cursor-not-allowed hover:bg-card"
                )}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
              {tabCounts.all - tabCounts.unread > 0 && (
                <button
                  type="button"
                  onClick={handleClearRead}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Clear read</span>
                </button>
              )}
              {tabCounts.all > 0 &&
                (confirmClearAll ? (
                  <span className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1.5">
                    <span className="text-xs text-foreground">Delete all?</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="rounded-md bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground hover:opacity-90"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Clear all</span>
                  </button>
                ))}
            </div>
          </div>
        </header>

        <div className="rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 p-3 sm:px-4 bg-muted/20">
            {(
              [
                { id: "all", label: "All", count: tabCounts.all },
                { id: "unread", label: "Unread", count: tabCounts.unread },
                { id: "messages", label: "Messages & Inquiries", count: tabCounts.messages },
                { id: "listings", label: "Listings", count: tabCounts.listings },
                { id: "system", label: "System", count: tabCounts.system },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                  setSelectedIds([]);
                }}
                aria-pressed={activeTab === tab.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-action text-action-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-1.5 text-[10px]",
                    activeTab === tab.id
                      ? "bg-action-foreground/20 text-action-foreground"
                      : "bg-background/80 text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/70 p-3 sm:px-4 bg-card">
            <div
              className={cn(
                "relative flex-1 max-w-sm flex items-center rounded-lg border border-border/70 bg-background px-3 py-1.5 transition-all",
                styles.searchInput
              )}
            >
              <Search size={14} className="text-muted-foreground shrink-0 mr-2" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search notifications..."
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Search notifications"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="text-muted-foreground hover:text-foreground ml-1"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="rounded border-border text-action focus:ring-ring h-4 w-4"
                  aria-label="Select all visible notifications"
                />
                <span>Select all</span>
              </label>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 border-l border-border/70 pl-3">
                  <span className="text-xs text-muted-foreground font-semibold">{selectedIds.length} selected</span>
                  <button
                    type="button"
                    onClick={handleBulkMarkRead}
                    className="inline-flex items-center gap-1 text-xs text-action hover:underline"
                    aria-label="Mark selected as read"
                  >
                    <CheckCheck size={13} />
                    <span>Mark read</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                    aria-label="Delete selected notifications"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={cn("divide-y divide-border/40 min-h-[20rem]", styles.customScrollbar)}>
            {loading && items.length === 0 ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
                <AlertCircle size={28} className="text-destructive" />
                <p className="text-sm font-medium">{error}</p>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3.5 py-1.5 text-xs font-medium text-action-foreground hover:bg-action/90 transition-colors"
                >
                  <RefreshCw size={13} />
                  <span>Retry</span>
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center gap-3" role="status">
                <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <Bell size={24} aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold">
                  {debouncedSearch
                    ? "No matching notifications"
                    : activeTab === "unread"
                      ? "You’re all caught up!"
                      : activeTab === "messages"
                        ? "No messages or inquiries"
                        : activeTab === "listings"
                          ? "No listing updates"
                          : activeTab === "system"
                            ? "No system alerts"
                            : "No notifications yet"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {debouncedSearch
                    ? "Try adjusting your search query or clear the filter."
                    : activeTab === "unread"
                      ? "You have read all of your notifications."
                      : "New alerts and updates will appear here."}
                </p>
                {debouncedSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="mt-2 text-xs font-medium text-action hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              items.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3.5 p-4 transition-colors relative group",
                      styles.itemRow,
                      !item.is_read ? "bg-action/5" : "bg-card",
                      isSelected && "bg-muted/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectItem(item.id)}
                      className="mt-1 rounded border-border text-action focus:ring-ring h-4 w-4 shrink-0"
                      aria-label={`Select ${item.title}`}
                    />

                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className="flex items-start gap-3.5 flex-1 min-w-0 text-left focus-visible:outline-none"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted/80 border border-border/80 flex items-center justify-center shrink-0 mt-0.5">
                        {getNotificationIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-foreground truncate">{item.title}</h4>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.body}</p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      {!item.is_read && (
                        <span className="w-2.5 h-2.5 rounded-full bg-action shrink-0 mr-1" aria-label="Unread notification" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteNotification(item.id).then(() => reload(activeTab, debouncedSearch, currentPage));
                        }}
                        aria-label={`Dismiss notification: ${item.title}`}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="border-t border-border/70 p-3 sm:px-4 bg-muted/10">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
