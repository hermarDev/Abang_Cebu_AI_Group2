"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArchiveRestore,
  Archive,
  ArrowLeft,
  Ban,
  Clock,
  Flag,
  Home,
  MessageSquare,
  MoreVertical,
  Search,
  SendHorizontal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  Bubble,
  BubbleContent,
  BubbleGroup,
  Marker,
  MarkerContent,
  MessageScroller,
  type MessageScrollerHandle,
} from "@/components/ui/chat";
import { notify } from "@/components/ui/AppToaster";
import { dispatchMessagesUpdated } from "./useUnreadMessageCount";
import {
  MESSAGE_MAX,
  REPORT_CATEGORIES,
  REPORT_DETAILS_MAX,
  REPORT_DETAILS_MIN,
  apiJson,
  composerBlockedReason,
  formatMessageTime,
  listingBadgeLabel,
  listingHref,
  mergeMessages,
  postThreadMessage,
  type ReportCategory,
  type RentalMessageItem,
  type RentalThreadDetail,
  type RentalThreadSummary,
  type ThreadDetailResponse,
} from "./messaging-client";

export type { RentalThreadSummary } from "./messaging-client";
export type MessagingInboxProps = {
  userId: string;
  userRole: "renter" | "landlord";
  initialThreadId?: string | null;
  initialThreads?: RentalThreadSummary[];
};

type OutboxItem = { operationId: string; body: string; status: "sending" | "failed"; createdAt: string };
type ReportTarget = { targetType: "conversation" | "message"; messageId?: string };
const POLL_MS = 10_000;
const NO_OUTBOX: OutboxItem[] = [];
const newId = () => globalThis.crypto.randomUUID();
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

type Retained = { drafts: Record<string, string>; outboxes: Record<string, OutboxItem[]> };
type Retain = (update: (owner: Retained) => Retained) => void;
const NO_RETAINED: Retained = { drafts: {}, outboxes: {} };

function getInitials(name?: string | null): string {
  if (!name) return "AC";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatDateSeparator(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function shouldShowMarker(currentMsg: RentalMessageItem, prevMsg: RentalMessageItem | null): boolean {
  if (!prevMsg) return true;
  return !isSameDay(new Date(currentMsg.createdAt), new Date(prevMsg.createdAt));
}

export function MessagingInbox(props: MessagingInboxProps) {
  const { userId } = props;
  const [retained, setRetained] = useState<Record<string, Retained>>({});
  const retain = useCallback<Retain>(
    (update) => setRetained((all) => ({ ...all, [userId]: update(all[userId] ?? NO_RETAINED) })),
    [userId]
  );
  const mine = retained[userId] ?? NO_RETAINED;
  const unsaved = Object.values(retained).some(
    (r) => Object.values(r.drafts).some((d) => d.trim()) || Object.values(r.outboxes).some((o) => o.length)
  );

  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  return (
    <MessagingInboxInner
      key={userId}
      {...props}
      drafts={mine.drafts}
      outboxes={mine.outboxes}
      retain={retain}
    />
  );
}

function MessagingInboxInner({
  userId,
  userRole,
  initialThreadId = null,
  initialThreads,
  drafts,
  outboxes,
  retain,
}: MessagingInboxProps & Retained & { retain: Retain }) {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [threads, setThreads] = useState<RentalThreadSummary[]>(initialThreads ?? []);
  const [listLoading, setListLoading] = useState(initialThreads === undefined);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialThreadId);
  const [detail, setDetail] = useState<RentalThreadDetail | null>(null);
  const [messages, setMessages] = useState<RentalMessageItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [detailLoading, setDetailLoading] = useState(Boolean(initialThreadId));
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [busy, setBusy] = useState(false);

  const scrollerRef = useRef<MessageScrollerHandle>(null);
  const stickToBottom = useRef(true);
  const selectedRef = useRef(selectedId);
  const generationRef = useRef(0);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  const tabRef = useRef(tab);
  const listSeq = useRef(0);
  const olderLoaded = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const draft = (selectedId && drafts[selectedId]) || "";
  const outbox = (selectedId && outboxes[selectedId]) || NO_OUTBOX;
  const setDraft = (value: string) => {
    if (selectedId) retain((r) => ({ ...r, drafts: { ...r.drafts, [selectedId]: value } }));
  };
  const updateOutbox = useCallback(
    (threadId: string, update: (list: OutboxItem[]) => OutboxItem[]) =>
      retain((r) => ({ ...r, outboxes: { ...r.outboxes, [threadId]: update(r.outboxes[threadId] ?? []) } })),
    [retain]
  );

  const summary = threads.find((t) => t.id === selectedId) ?? null;
  const thread = detail?.id === selectedId ? detail : summary;

  const patchThread = useCallback((id: string, patch: Partial<RentalThreadSummary>) => {
    setThreads((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setDetail((d) => (d && d.id === id ? { ...d, ...patch } : d));
  }, []);

  const loadThreads = useCallback(
    async (archived: boolean, quiet = false) => {
      const seq = ++listSeq.current;
      if (!quiet) setListLoading(true);
      try {
        const { threads: next } = await apiJson<{ threads: RentalThreadSummary[] }>(
          `/api/messages/threads?archived=${archived}`,
          userId
        );
        if (seq !== listSeq.current) return;
        setThreads(next.filter((t) => t.isArchived === archived));
        setListError(null);
      } catch (error) {
        if (!quiet && seq === listSeq.current)
          setListError(error instanceof Error ? error.message : "Couldn't load messages.");
      } finally {
        if (seq === listSeq.current) setListLoading(false);
      }
    },
    [userId]
  );

  const skipFirstLoad = useRef(initialThreads !== undefined);
  useEffect(() => {
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false;
      return;
    }
    void loadThreads(tab === "archived");
  }, [tab, loadThreads]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadThreads(tab === "archived", true);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [tab, loadThreads]);

  const markRead = useCallback(
    async (id: string) => {
      try {
        await apiJson<{ ok: true }>(`/api/messages/threads/${encodeURIComponent(id)}`, userId, {
          method: "PATCH",
          body: JSON.stringify({ action: "mark_read" }),
        });
        patchThread(id, { unreadCount: 0 });
        if (alive.current) dispatchMessagesUpdated();
      } catch {
        /* badge corrects itself on the next poll */
      }
    },
    [userId, patchThread]
  );

  const openThread = useCallback(
    async (id: string) => {
      const generation = generationRef.current;
      const current = () => alive.current && selectedRef.current === id && generationRef.current === generation;
      try {
        const data = await apiJson<ThreadDetailResponse>(
          `/api/messages/threads/${encodeURIComponent(id)}?limit=50`,
          userId
        );
        if (!current()) return;
        stickToBottom.current = true;
        setDetail(data.thread);
        setMessages((existing) => mergeMessages(existing, data.messages));
        if (!olderLoaded.current) setHasMore(data.hasMore);
        if (data.thread.unreadCount > 0) void markRead(id);
      } catch (error) {
        if (current()) setDetailError(error instanceof Error ? error.message : "Couldn't load this conversation.");
      } finally {
        if (current()) setDetailLoading(false);
      }
    },
    [userId, markRead]
  );

  useEffect(() => {
    // openThread only sets state after its awaited fetch resolves (external sync), so no cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedId) void openThread(selectedId);
  }, [selectedId, openThread]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const generation = generationRef.current;
      try {
        const data = await apiJson<ThreadDetailResponse>(
          `/api/messages/threads/${encodeURIComponent(selectedId)}?limit=50`,
          userId
        );
        if (!alive.current || selectedRef.current !== selectedId || generationRef.current !== generation) return;
        const known = new Set(messagesRef.current.map((m) => m.id));
        const hasNewIncoming = data.messages.some((m) => !known.has(m.id) && m.senderId !== userId);
        setMessages((current) => mergeMessages(current, data.messages));
        setDetail(data.thread);
        if (hasNewIncoming || data.thread.unreadCount > 0) void markRead(selectedId);
      } catch {
        /* keep current view */
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [selectedId, userId, markRead]);

  useEffect(() => {
    if (scrollerRef.current && stickToBottom.current) {
      scrollerRef.current.scrollToBottom();
    }
  }, [messages, outbox]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 44), 140);
    el.style.height = `${nextHeight}px`;
  }, [draft]);

  const select = (id: string | null) => {
    if (id === selectedRef.current) return;
    generationRef.current++;
    olderLoaded.current = false;
    setDetail(null);
    setMessages([]);
    setHasMore(false);
    setLoadingOlder(false);
    setDetailError(null);
    setDetailLoading(Boolean(id));
    selectedRef.current = id;
    setSelectedId(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", id ? `?thread=${encodeURIComponent(id)}` : window.location.pathname);
    }
  };

  async function loadOlder() {
    if (!selectedId || !messages.length || loadingOlder) return;
    const threadId = selectedId;
    const generation = generationRef.current;
    const current = () => alive.current && selectedRef.current === threadId && generationRef.current === generation;
    setLoadingOlder(true);
    stickToBottom.current = false;
    try {
      const data = await apiJson<ThreadDetailResponse>(
        `/api/messages/threads/${encodeURIComponent(threadId)}?before=${encodeURIComponent(
          messages[0].createdAt
        )}&limit=50`,
        userId
      );
      if (!current()) return;
      setMessages((existing) => mergeMessages(data.messages, existing));
      olderLoaded.current = true;
      setHasMore(data.hasMore);
    } catch (error) {
      if (current())
        notify("error", "messages-older", error instanceof Error ? error.message : "Couldn't load older messages.");
    } finally {
      if (current()) setLoadingOlder(false);
    }
  }

  async function deliver(item: OutboxItem) {
    if (!selectedId) return;
    const threadId = selectedId;
    stickToBottom.current = true;
    updateOutbox(threadId, (list) =>
      list.map((o) => (o.operationId === item.operationId ? { ...o, status: "sending" } : o))
    );
    try {
      const message = await postThreadMessage(threadId, userId, item.operationId, item.body);
      updateOutbox(threadId, (list) => list.filter((o) => o.operationId !== item.operationId));
      if (selectedRef.current === threadId) setMessages((current) => mergeMessages(current, [message]));
      patchThread(threadId, { lastMessagePreview: message.body.slice(0, 140), lastMessageAt: message.createdAt });
      if (alive.current) dispatchMessagesUpdated();
    } catch (error) {
      updateOutbox(threadId, (list) =>
        list.map((o) => (o.operationId === item.operationId ? { ...o, status: "failed" } : o))
      );
      if (alive.current)
        notify("error", "messages-send", error instanceof Error ? error.message : "Message wasn't sent.");
    }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > MESSAGE_MAX || !thread?.canSend || outbox.some((o) => o.status === "sending")) return;
    const item: OutboxItem = { operationId: newId(), body, status: "sending", createdAt: new Date().toISOString() };
    updateOutbox(thread.id, (list) => [...list, item]);
    setDraft("");
    void deliver(item);
  }

  async function setArchived(archived: boolean) {
    if (!thread) return;
    const threadId = thread.id;
    const generation = generationRef.current;
    const sourceTab = archived ? "active" : "archived";
    setBusy(true);
    try {
      await apiJson<{ ok: true }>(`/api/messages/threads/${encodeURIComponent(threadId)}`, userId, {
        method: "PATCH",
        body: JSON.stringify({ action: archived ? "archive" : "unarchive" }),
      });
      if (!alive.current) return;
      patchThread(threadId, { isArchived: archived });
      if (tabRef.current === sourceTab) setThreads((list) => list.filter((t) => t.id !== threadId));
      if (selectedRef.current === threadId && generationRef.current === generation) select(null);
      dispatchMessagesUpdated();
      notify("success", "messages-archive", archived ? "Conversation archived." : "Conversation moved to Active.");
    } catch (error) {
      if (alive.current)
        notify("error", "messages-archive", error instanceof Error ? error.message : "Couldn't update this conversation.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function setBlocked(blocked: boolean) {
    if (!thread) return;
    setBusy(true);
    try {
      await apiJson<{ blocked: boolean }>("/api/blocks", userId, {
        method: blocked ? "POST" : "DELETE",
        body: JSON.stringify({ targetUserId: thread.counterpart.id }),
      });
      if (!alive.current) return;
      patchThread(thread.id, { isBlocked: blocked, blockedByViewer: blocked, ...(blocked ? { canSend: false } : {}) });
      setBlockOpen(false);
      void openThread(thread.id);
      notify("success", "messages-block", blocked ? "User blocked." : "User unblocked.");
    } catch (error) {
      if (alive.current)
        notify("error", "messages-block", error instanceof Error ? error.message : "Couldn't update the block.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  const blockedReason = thread ? composerBlockedReason(thread) : null;
  const sending = outbox.some((o) => o.status === "sending");

  const filteredThreads = threads.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const title = (t.listingTitle ?? "").toLowerCase();
    const name = (t.counterpart.fullName ?? "").toLowerCase();
    return title.includes(q) || name.includes(q);
  });

  const messageElements: React.ReactNode[] = [];
  for (let i = 0; i < messages.length; i++) {
    const current = messages[i];
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;

    if (shouldShowMarker(current, prev)) {
      messageElements.push(
        <Marker key={`marker-${current.id}`}>
          <MarkerContent>{formatDateSeparator(current.createdAt)}</MarkerContent>
        </Marker>
      );
    }

    const isMine = current.senderId === userId;
    const isNextSameSender =
      next &&
      next.senderId === current.senderId &&
      isSameDay(new Date(current.createdAt), new Date(next.createdAt));
    const showAvatar = !isMine && !isNextSameSender;

    messageElements.push(
      <MessageItem
        key={current.id}
        message={current}
        mine={isMine}
        counterpart={thread?.counterpart}
        showAvatar={showAvatar}
        onReport={() => setReportTarget({ targetType: "message", messageId: current.id })}
      />
    );
  }

  return (
    <div className="grid h-full min-h-[30rem] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xs lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside
        aria-label="Conversations"
        className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-border lg:border-r`}
      >
        <div role="tablist" aria-label="Conversation filter" className="grid grid-cols-2 gap-1 border-b border-border p-2">
          {(["active", "archived"] as const).map((value) => {
            const isSelected = tab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  tabRef.current = value;
                  setTab(value);
                  setSearchQuery("");
                  select(null);
                }}
                className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${focusRing} ${
                  isSelected ? "bg-action/10 text-action" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {value === "active" ? "Active" : "Archived"}
                {value === tab && threads.length > 0 && (
                  <span className="ml-1 text-xs opacity-75">({threads.length})</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="border-b border-border p-2">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              aria-label="Search conversations"
              className="h-10 pl-8.5 pr-8 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {listLoading ? (
            <ul className="grid gap-1 p-2" role="status" aria-label="Loading conversations">
              {[0, 1, 2, 3].map((i) => (
                <li key={i}>
                  <Skeleton className="h-20 w-full rounded-xl" />
                </li>
              ))}
            </ul>
          ) : listError ? (
            <div role="alert" className="grid gap-3 p-4 text-sm">
              <p>{listError}</p>
              <Button variant="outline" onClick={() => void loadThreads(tab === "archived")}>
                Try again
              </Button>
            </div>
          ) : filteredThreads.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {searchQuery
                ? `No conversations match "${searchQuery}".`
                : tab === "active"
                ? "No conversations yet. Message a landlord from any listing to start one."
                : "No archived conversations."}
            </p>
          ) : (
            <ul className="grid gap-1 p-2 list-none m-0">
              {filteredThreads.map((t) => {
                const thumbUrl = t.listingThumbnailUrl ?? t.listingPhotoUrl ?? null;
                const isSelected = t.id === selectedId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => select(t.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`grid w-full grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-xl p-2.5 text-left transition-colors ${focusRing} ${
                        isSelected ? "border-l-2 border-action bg-action/10 pl-2" : "hover:bg-muted"
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <Avatar className="size-11 shrink-0">
                          <AvatarImage src={t.counterpart.avatarUrl ?? undefined} alt={t.counterpart.fullName ?? ""} />
                          <AvatarFallback>{getInitials(t.counterpart.fullName)}</AvatarFallback>
                        </Avatar>
                        {thumbUrl && (
                          <span className="absolute -bottom-1 -right-1 size-5 overflow-hidden rounded-full border-2 border-card bg-muted shadow-xs">
                            <Image src={thumbUrl} alt="" width={20} height={20} unoptimized className="size-full object-cover" />
                          </span>
                        )}
                      </div>
                      <span className="grid min-w-0 gap-0.5">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{t.listingTitle}</span>
                          {t.unreadCount > 0 && (
                            <>
                              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-action" />
                              <span
                                aria-label={`${t.unreadCount} unread`}
                                className="ml-auto shrink-0 rounded-full bg-action px-1.5 text-xs font-bold leading-5 text-action-foreground"
                              >
                                {t.unreadCount > 99 ? "99+" : t.unreadCount}
                              </span>
                            </>
                          )}
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="truncate">{t.counterpart.fullName ?? "AbangCebu user"}</span>
                          <Badge variant="outline" className="px-1.5 py-0 text-[0.65rem] capitalize">
                            {t.counterpart.role}
                          </Badge>
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {t.lastMessagePreview ?? "No messages yet"}
                        </span>
                        <span className="flex items-center justify-between gap-2 text-xs">
                          <Badge
                            variant={listingBadgeLabel(t) === "Published · Available" ? "default" : "secondary"}
                            className="truncate px-1.5 py-0 text-[0.65rem]"
                          >
                            {listingBadgeLabel(t)}
                          </Badge>
                          <time dateTime={t.lastMessageAt ?? undefined} className="shrink-0 text-muted-foreground text-[0.7rem]">
                            {formatMessageTime(t.lastMessageAt)}
                          </time>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section
        aria-label="Conversation"
        className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col`}
      >
        {!selectedId || !thread ? (
          selectedId && detailError ? (
            <div role="alert" className="grid gap-3 p-6 text-sm">
              <Button variant="outline" onClick={() => select(null)}>
                Back to messages
              </Button>
              <p>{detailError}</p>
            </div>
          ) : selectedId ? (
            <div className="grid gap-3 p-4" role="status" aria-label="Loading conversation">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className={`h-14 ${i % 2 ? "ml-auto w-2/3" : "w-3/4"}`} />
              ))}
            </div>
          ) : (
            <div className="m-auto grid justify-items-center gap-2 p-8 text-center text-muted-foreground">
              <MessageSquare size={32} aria-hidden="true" />
              <p className="text-sm">Select a conversation to read it.</p>
            </div>
          )
        ) : (
          <>
            <header className="sticky top-0 z-10 grid gap-2 border-b border-border bg-card p-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden min-h-10 px-2 -ml-1 text-muted-foreground hover:text-foreground"
                    onClick={() => select(null)}
                    aria-label="Back to messages"
                  >
                    <ArrowLeft size={18} aria-hidden="true" />
                    <span className="text-xs font-semibold sm:inline hidden">Back to messages</span>
                  </Button>
                  <Avatar
                    key={`${thread.counterpart.id}:${thread.counterpart.avatarUrl ?? ""}`}
                    className="size-9 shrink-0"
                  >
                    <AvatarImage src={thread.counterpart.avatarUrl ?? undefined} alt={thread.counterpart.fullName ?? ""} />
                    <AvatarFallback>{getInitials(thread.counterpart.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-sm font-semibold">{thread.counterpart.fullName ?? "AbangCebu user"}</h2>
                      <Badge variant="outline" className="px-1.5 py-0 text-[0.65rem] capitalize">
                        {thread.counterpart.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {thread.counterpart.isSuspended ? "Account suspended" : "Direct conversation"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <details className="group relative">
                    <summary
                      aria-label="Conversation actions"
                      title="Conversation actions"
                      className="inline-flex size-9 min-h-9 cursor-pointer list-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
                    >
                      <MoreVertical size={18} aria-hidden="true" />
                    </summary>
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 grid min-w-44 gap-1 rounded-xl border border-border bg-card p-1 text-card-foreground shadow-lg">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.currentTarget.closest("details")?.removeAttribute("open");
                          void setArchived(!thread.isArchived);
                        }}
                        className="flex w-full min-h-9 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring text-left"
                      >
                        {thread.isArchived ? (
                          <ArchiveRestore size={15} aria-hidden="true" />
                        ) : (
                          <Archive size={15} aria-hidden="true" />
                        )}
                        <span>{thread.isArchived ? "Unarchive" : "Archive"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.currentTarget.closest("details")?.removeAttribute("open");
                          if (thread.blockedByViewer) void setBlocked(false);
                          else setBlockOpen(true);
                        }}
                        className="flex w-full min-h-9 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-ring text-left"
                      >
                        <Ban size={15} aria-hidden="true" />
                        <span>{thread.blockedByViewer ? "Unblock user" : "Block user"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.currentTarget.closest("details")?.removeAttribute("open");
                          setReportTarget({ targetType: "conversation" });
                        }}
                        className="flex w-full min-h-9 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring text-left"
                      >
                        <Flag size={15} aria-hidden="true" />
                        <span>Report</span>
                      </button>
                    </div>
                  </details>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/40 p-2 text-xs">
                {thread.listingPhotoUrl || thread.listingThumbnailUrl ? (
                  <Image
                    src={thread.listingThumbnailUrl ?? thread.listingPhotoUrl ?? ""}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="size-9 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Home size={16} aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={listingHref(thread, userRole)}
                    className={`font-semibold text-foreground truncate block hover:underline ${focusRing}`}
                  >
                    {thread.listingTitle}
                  </Link>
                  {thread.listingPrice != null && (
                    <span className="text-muted-foreground">₱{Number(thread.listingPrice).toLocaleString("en-PH")}/month</span>
                  )}
                </div>
                <Badge
                  variant={listingBadgeLabel(thread) === "Published · Available" ? "default" : "secondary"}
                  className="shrink-0 text-[0.65rem] px-2 py-0.5"
                >
                  {listingBadgeLabel(thread)}
                </Badge>
              </div>
            </header>

            <MessageScroller
              ref={scrollerRef}
              onScrollBottomChange={(atBottom) => {
                stickToBottom.current = atBottom;
              }}
              className="p-3"
            >
              {hasMore && (
                <div className="mb-3 grid">
                  <Button variant="outline" size="sm" disabled={loadingOlder} onClick={() => void loadOlder()}>
                    {loadingOlder ? "Loading…" : "Load older messages"}
                  </Button>
                </div>
              )}
              {detailLoading && !messages.length ? (
                <div className="grid gap-3" role="status" aria-label="Loading messages">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className={`h-14 ${i % 2 ? "ml-auto w-2/3" : "w-3/4"}`} />
                  ))}
                </div>
              ) : detailError && !messages.length ? (
                <p role="alert" className="text-sm">
                  {detailError}
                </p>
              ) : (
                <ol className="grid gap-2 list-none p-0 m-0">
                  {messageElements}
                  {outbox.map((o) => (
                    <Message key={o.operationId} mine>
                      <MessageContent mine>
                        <BubbleGroup>
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                              o.status === "sending"
                                ? "border border-border bg-card/80 text-muted-foreground animate-pulse"
                                : "border border-destructive/40 bg-destructive/10 text-foreground"
                            }`}
                          >
                            <BubbleContent>{o.body}</BubbleContent>
                            {o.status === "sending" ? (
                              <div className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                                <Clock size={12} className="animate-spin" aria-hidden="true" />
                                <span>Sending…</span>
                              </div>
                            ) : (
                              <div
                                role="alert"
                                className="mt-1.5 flex items-center justify-between gap-3 text-xs text-destructive"
                              >
                                <span className="flex items-center gap-1">
                                  <AlertCircle size={13} aria-hidden="true" />
                                  <span>Message wasn&apos;t sent</span>
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="min-h-8 h-8 px-2 text-xs border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => void deliver(o)}
                                >
                                  Retry
                                </Button>
                              </div>
                            )}
                          </div>
                        </BubbleGroup>
                      </MessageContent>
                    </Message>
                  ))}
                </ol>
              )}
            </MessageScroller>

            <form
              onSubmit={send}
              className="grid gap-2 border-t border-border bg-card p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))]"
            >
              {blockedReason && (
                <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {blockedReason}
                </p>
              )}
              <div className="relative flex items-center rounded-2xl border border-input bg-card shadow-2xs transition-all focus-within:border-action focus-within:ring-2 focus-within:ring-action/20">
                <label htmlFor="message-composer" className="sr-only">
                  Message
                </label>
                <textarea
                  ref={textareaRef}
                  id="message-composer"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={!thread.canSend}
                  maxLength={MESSAGE_MAX}
                  rows={1}
                  placeholder={thread.canSend ? "Write a message…" : "Messaging is not available"}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  className="min-h-11 max-h-36 w-full resize-none border-0 bg-transparent py-2.5 pl-3.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={!thread.canSend || sending || !draft.trim()}
                  aria-label={sending ? "Sending message…" : "Send message"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-8 min-h-8 rounded-full p-0 flex items-center justify-center bg-action text-action-foreground hover:bg-action-hover disabled:opacity-40"
                >
                  {sending ? (
                    <Clock size={15} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <SendHorizontal size={15} aria-hidden="true" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between px-1 text-[0.7rem] text-muted-foreground">
                <span>Enter to send · Shift+Enter for new line</span>
                <span>
                  {draft.length} / {MESSAGE_MAX}
                </span>
              </div>
            </form>

            <Modal
              open={blockOpen}
              onClose={() => setBlockOpen(false)}
              title="Block this user?"
              description="You and this user won't be able to send new messages in your shared conversations. Past messages stay readable."
            >
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBlockOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" disabled={busy} onClick={() => void setBlocked(true)}>
                  Block user
                </Button>
              </div>
            </Modal>
            {reportTarget && (
              <ReportDialog
                thread={thread}
                userId={userId}
                targetType={reportTarget.targetType}
                messageId={reportTarget.messageId}
                onClose={() => setReportTarget(null)}
                onDone={(blocked) => {
                  setReportTarget(null);
                  if (blocked) void openThread(thread.id);
                }}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}

export function MessageItem({
  message: m,
  mine,
  onReport,
  counterpart,
  showAvatar = true,
}: {
  message: RentalMessageItem;
  mine: boolean;
  onReport: () => void;
  counterpart?: { fullName: string | null; avatarUrl: string | null } | null;
  showAvatar?: boolean;
}) {
  return (
    <Message mine={mine}>
      {!mine && showAvatar && (
        <MessageAvatar>
          <Avatar className="size-7">
            <AvatarImage src={counterpart?.avatarUrl ?? undefined} alt={counterpart?.fullName ?? ""} />
            <AvatarFallback className="text-[0.65rem]">{getInitials(counterpart?.fullName)}</AvatarFallback>
          </Avatar>
        </MessageAvatar>
      )}
      {!mine && !showAvatar && <div className="size-7 shrink-0" aria-hidden="true" />}
      <MessageContent mine={mine}>
        <BubbleGroup>
          <div className="group relative flex items-center gap-1.5">
            <Bubble mine={mine}>
              <BubbleContent>{m.body}</BubbleContent>
            </Bubble>
            {!mine && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Report message"
                className="size-7 min-h-7 p-0 text-muted-foreground opacity-80 group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
                onClick={onReport}
              >
                <Flag size={13} aria-hidden="true" />
              </Button>
            )}
          </div>
        </BubbleGroup>
        <MessageFooter className={mine ? "justify-end" : "justify-start"}>
          <time dateTime={m.createdAt}>{formatMessageTime(m.createdAt)}</time>
        </MessageFooter>
      </MessageContent>
    </Message>
  );
}

function ReportDialog({
  thread,
  userId,
  targetType,
  messageId,
  onClose,
  onDone,
}: {
  thread: RentalThreadDetail;
  userId: string;
  targetType: "conversation" | "message";
  messageId?: string;
  onClose: () => void;
  onDone: (blocked: boolean) => void;
}) {
  const [category, setCategory] = useState<ReportCategory>("scam_or_fraud");
  const [details, setDetails] = useState("");
  const [blockUser, setBlockUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operationId = useRef(newId());
  const length = details.trim().length;
  const valid = length >= REPORT_DETAILS_MIN && length <= REPORT_DETAILS_MAX;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiJson<unknown>("/api/reports", userId, {
        method: "POST",
        body: JSON.stringify({
          operationId: operationId.current,
          targetType,
          conversationId: thread.id,
          ...(messageId ? { messageId } : {}),
          category,
          details: details.trim(),
          blockUser,
        }),
      });
      notify("success", "messages-report", "Report sent. Thanks for helping keep AbangCebu safe.");
      onDone(blockUser);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't send the report.";
      setError(message);
      notify("error", "messages-report", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={targetType === "message" ? "Report message" : "Report conversation"}
      description="Tell us what happened. Our team reviews the conversation."
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
    >
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium">
          Reason
          <Select
            aria-label="Report reason"
            value={category}
            onValueChange={(value) => setCategory(value as ReportCategory)}
            options={REPORT_CATEGORIES}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Details
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={REPORT_DETAILS_MAX}
            rows={4}
            aria-invalid={length > 0 && !valid}
            className={`w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-foreground ${focusRing}`}
          />
          <span className="text-xs font-normal text-muted-foreground">
            {length}/{REPORT_DETAILS_MAX} · at least {REPORT_DETAILS_MIN} characters
          </span>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={blockUser}
            onChange={(e) => setBlockUser(e.target.checked)}
            className="size-4"
          />
          Also block this user
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || submitting}>
            {submitting ? "Sending…" : "Send report"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
