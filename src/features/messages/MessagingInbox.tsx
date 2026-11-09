"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArchiveRestore, Archive, ArrowLeft, Ban, Flag, Home, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { notify } from "@/components/ui/AppToaster";
import { dispatchMessagesUpdated } from "./useUnreadMessageCount";
import {
  MESSAGE_MAX, REPORT_CATEGORIES, REPORT_DETAILS_MAX, REPORT_DETAILS_MIN, apiJson, composerBlockedReason, formatMessageTime, listingBadgeLabel, listingHref, mergeMessages, postThreadMessage,
  type ReportCategory, type RentalMessageItem, type RentalThreadDetail, type RentalThreadSummary, type ThreadDetailResponse,
} from "./messaging-client";

export type { RentalThreadSummary } from "./messaging-client";
export type MessagingInboxProps = { userId: string; userRole: "renter" | "landlord"; initialThreadId?: string | null; initialThreads?: RentalThreadSummary[] };

type OutboxItem = { operationId: string; body: string; status: "sending" | "failed"; createdAt: string };
type ReportTarget = { targetType: "conversation" | "message"; messageId?: string };
const POLL_MS = 10_000;
const NO_OUTBOX: OutboxItem[] = [];
const newId = () => globalThis.crypto.randomUUID();
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

type Retained = { drafts: Record<string, string>; outboxes: Record<string, OutboxItem[]> };
type Retain = (update: (owner: Retained) => Retained) => void;
const NO_RETAINED: Retained = { drafts: {}, outboxes: {} };

// Keyed by userId: an account change remounts the inner view, so A's threads and in-flight responses can never reach B.
// Unsent drafts and failed/pending sends (with their operationId) are kept here per owner and handed only to that owner's view,
// so B never sees A's content and A→B→A restores it. Memory-only: lost on unmount/reload, hence the beforeunload guard below.
export function MessagingInbox(props: MessagingInboxProps) {
  const { userId } = props;
  const [retained, setRetained] = useState<Record<string, Retained>>({});
  const retain = useCallback<Retain>(update => setRetained(all => ({ ...all, [userId]: update(all[userId] ?? NO_RETAINED) })), [userId]);
  const mine = retained[userId] ?? NO_RETAINED;
  const unsaved = Object.values(retained).some(r => Object.values(r.drafts).some(d => d.trim()) || Object.values(r.outboxes).some(o => o.length));
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
  return <MessagingInboxInner key={userId} {...props} drafts={mine.drafts} outboxes={mine.outboxes} retain={retain} />;
}

function MessagingInboxInner({ userId, userRole, initialThreadId = null, initialThreads, drafts, outboxes, retain }: MessagingInboxProps & Retained & { retain: Retain }) {
  const [tab, setTab] = useState<"active" | "archived">("active");
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
  // Drafts and outbox live in the wrapper (per owner, per thread) so neither thread nor account switches discard unsent or failed work (retry keeps its operationId).
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const selectedRef = useRef(selectedId);
  const generationRef = useRef(0); // bumped on every selection change so A→B→A can't accept A's earlier async results
  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);
  const tabRef = useRef(tab);
  const listSeq = useRef(0); // latest thread-list request wins, so a held response for another tab can't overwrite this one
  const olderLoaded = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const draft = (selectedId && drafts[selectedId]) || "";
  const outbox = (selectedId && outboxes[selectedId]) || NO_OUTBOX;
  const setDraft = (value: string) => { if (selectedId) retain(r => ({ ...r, drafts: { ...r.drafts, [selectedId]: value } })); };
  const updateOutbox = useCallback((threadId: string, update: (list: OutboxItem[]) => OutboxItem[]) => retain(r => ({ ...r, outboxes: { ...r.outboxes, [threadId]: update(r.outboxes[threadId] ?? []) } })), [retain]);

  const summary = threads.find(t => t.id === selectedId) ?? null;
  const thread = detail?.id === selectedId ? detail : summary;

  const patchThread = useCallback((id: string, patch: Partial<RentalThreadSummary>) => {
    setThreads(list => list.map(t => t.id === id ? { ...t, ...patch } : t));
    setDetail(d => d && d.id === id ? { ...d, ...patch } : d);
  }, []);

  const loadThreads = useCallback(async (archived: boolean, quiet = false) => {
    const seq = ++listSeq.current;
    if (!quiet) setListLoading(true);
    try {
      const { threads: next } = await apiJson<{ threads: RentalThreadSummary[] }>(`/api/messages/threads?archived=${archived}`, userId);
      if (seq !== listSeq.current) return;
      setThreads(next.filter(t => t.isArchived === archived));
      setListError(null);
    } catch (error) {
      if (!quiet && seq === listSeq.current) setListError(error instanceof Error ? error.message : "Couldn't load messages.");
    } finally {
      if (seq === listSeq.current) setListLoading(false);
    }
  }, [userId]);

  const skipFirstLoad = useRef(initialThreads !== undefined);
  useEffect(() => {
    if (skipFirstLoad.current) { skipFirstLoad.current = false; return; }
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

  const markRead = useCallback(async (id: string) => {
    try {
      await apiJson<{ ok: true }>(`/api/messages/threads/${encodeURIComponent(id)}`, userId, { method: "PATCH", body: JSON.stringify({ action: "mark_read" }) });
      patchThread(id, { unreadCount: 0 });
      if (alive.current) dispatchMessagesUpdated();
    } catch { /* badge corrects itself on the next poll */ }
  }, [userId, patchThread]);

  const openThread = useCallback(async (id: string) => {
    const generation = generationRef.current;
    const current = () => alive.current && selectedRef.current === id && generationRef.current === generation;
    try {
      const data = await apiJson<ThreadDetailResponse>(`/api/messages/threads/${encodeURIComponent(id)}?limit=50`, userId);
      if (!current()) return;
      stickToBottom.current = true;
      setDetail(data.thread);
      // Merge, never replace: a POST that succeeded while this GET was held must survive it.
      setMessages(existing => mergeMessages(existing, data.messages));
      if (!olderLoaded.current) setHasMore(data.hasMore);
      if (data.thread.unreadCount > 0) void markRead(id);
    } catch (error) {
      if (current()) setDetailError(error instanceof Error ? error.message : "Couldn't load this conversation.");
    } finally {
      if (current()) setDetailLoading(false);
    }
  }, [userId, markRead]);

  useEffect(() => {
    // openThread only sets state after its awaited fetch resolves (external sync), so no cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedId) void openThread(selectedId);
  }, [selectedId, openThread]);

  // Visibility-aware poll of the open thread; merges by id so it never duplicates optimistic items.
  useEffect(() => {
    if (!selectedId) return;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const generation = generationRef.current;
      try {
        const data = await apiJson<ThreadDetailResponse>(`/api/messages/threads/${encodeURIComponent(selectedId)}?limit=50`, userId);
        if (!alive.current || selectedRef.current !== selectedId || generationRef.current !== generation) return; // A→B→A: this response predates the current view
        const known = new Set(messagesRef.current.map(m => m.id));
        const hasNewIncoming = data.messages.some(m => !known.has(m.id) && m.senderId !== userId);
        setMessages(current => mergeMessages(current, data.messages));
        setDetail(data.thread);
        if (hasNewIncoming || data.thread.unreadCount > 0) void markRead(selectedId);
      } catch { /* keep the current view; the next tick retries */ }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [selectedId, userId, markRead]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, outbox]);

  const select = (id: string | null) => {
    if (id === selectedRef.current) return;
    generationRef.current++;
    olderLoaded.current = false;
    setDetail(null); setMessages([]); setHasMore(false); setLoadingOlder(false); setDetailError(null); setDetailLoading(Boolean(id));
    selectedRef.current = id;
    setSelectedId(id);
    if (typeof window !== "undefined") window.history.replaceState(null, "", id ? `?thread=${encodeURIComponent(id)}` : window.location.pathname);
  };

  async function loadOlder() {
    if (!selectedId || !messages.length || loadingOlder) return;
    const threadId = selectedId;
    const generation = generationRef.current;
    const current = () => alive.current && selectedRef.current === threadId && generationRef.current === generation;
    setLoadingOlder(true);
    stickToBottom.current = false;
    try {
      const data = await apiJson<ThreadDetailResponse>(`/api/messages/threads/${encodeURIComponent(threadId)}?before=${encodeURIComponent(messages[0].createdAt)}&limit=50`, userId);
      if (!current()) return;
      setMessages(existing => mergeMessages(data.messages, existing));
      olderLoaded.current = true;
      setHasMore(data.hasMore);
    } catch (error) {
      if (current()) notify("error", "messages-older", error instanceof Error ? error.message : "Couldn't load older messages.");
    } finally {
      if (current()) setLoadingOlder(false);
    }
  }

  async function deliver(item: OutboxItem) {
    if (!selectedId) return;
    const threadId = selectedId;
    stickToBottom.current = true;
    updateOutbox(threadId, list => list.map(o => o.operationId === item.operationId ? { ...o, status: "sending" } : o));
    try {
      const message = await postThreadMessage(threadId, userId, item.operationId, item.body);
      updateOutbox(threadId, list => list.filter(o => o.operationId !== item.operationId));
      if (selectedRef.current === threadId) setMessages(current => mergeMessages(current, [message]));
      patchThread(threadId, { lastMessagePreview: message.body.slice(0, 140), lastMessageAt: message.createdAt });
      if (alive.current) dispatchMessagesUpdated();
    } catch (error) {
      updateOutbox(threadId, list => list.map(o => o.operationId === item.operationId ? { ...o, status: "failed" } : o));
      if (alive.current) notify("error", "messages-send", error instanceof Error ? error.message : "Message wasn't sent.");
    }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > MESSAGE_MAX || !thread?.canSend || outbox.some(o => o.status === "sending")) return;
    const item: OutboxItem = { operationId: newId(), body, status: "sending", createdAt: new Date().toISOString() };
    updateOutbox(thread.id, list => [...list, item]);
    setDraft("");
    void deliver(item);
  }

  async function setArchived(archived: boolean) {
    if (!thread) return;
    const threadId = thread.id;
    const generation = generationRef.current;
    const sourceTab = archived ? "active" : "archived"; // the tab whose list holds this thread
    setBusy(true);
    try {
      await apiJson<{ ok: true }>(`/api/messages/threads/${encodeURIComponent(threadId)}`, userId, { method: "PATCH", body: JSON.stringify({ action: archived ? "archive" : "unarchive" }) });
      if (!alive.current) return;
      patchThread(threadId, { isArchived: archived });
      if (tabRef.current === sourceTab) setThreads(list => list.filter(t => t.id !== threadId)); // never edit another tab's list
      if (selectedRef.current === threadId && generationRef.current === generation) select(null); // not if the user moved away and came back (A→B→A)
      dispatchMessagesUpdated();
      notify("success", "messages-archive", archived ? "Conversation archived." : "Conversation moved to Active.");
    } catch (error) {
      if (alive.current) notify("error", "messages-archive", error instanceof Error ? error.message : "Couldn't update this conversation.");
    } finally { if (alive.current) setBusy(false); }
  }

  async function setBlocked(blocked: boolean) {
    if (!thread) return;
    setBusy(true);
    try {
      await apiJson<{ blocked: boolean }>("/api/blocks", userId, { method: blocked ? "POST" : "DELETE", body: JSON.stringify({ targetUserId: thread.counterpart.id }) });
      if (!alive.current) return;
      patchThread(thread.id, { isBlocked: blocked, blockedByViewer: blocked, ...(blocked ? { canSend: false } : {}) });
      setBlockOpen(false);
      void openThread(thread.id);
      notify("success", "messages-block", blocked ? "User blocked." : "User unblocked.");
    } catch (error) {
      if (alive.current) notify("error", "messages-block", error instanceof Error ? error.message : "Couldn't update the block.");
    } finally { if (alive.current) setBusy(false); }
  }

  const blockedReason = thread ? composerBlockedReason(thread) : null;
  const sending = outbox.some(o => o.status === "sending");

  return <div className="grid h-full min-h-[30rem] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm lg:grid-cols-[340px_minmax(0,1fr)]">
    <aside aria-label="Conversations" className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-border lg:border-r`}>
      <div role="tablist" aria-label="Conversation filter" className="grid grid-cols-2 gap-1 border-b border-border p-2">
        {(["active", "archived"] as const).map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => { tabRef.current = value; setTab(value); select(null); }}
          className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${focusRing} ${tab === value ? "bg-action/10 text-action" : "text-muted-foreground hover:bg-muted"}`}>{value === "active" ? "Active" : "Archived"}</button>)}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {listLoading ? <ul className="grid gap-1 p-2" role="status" aria-label="Loading conversations">{[0, 1, 2, 3].map(i => <li key={i}><Skeleton className="h-20 w-full" /></li>)}</ul>
          : listError ? <div role="alert" className="grid gap-3 p-4 text-sm"><p>{listError}</p><Button variant="outline" onClick={() => void loadThreads(tab === "archived")}>Try again</Button></div>
          : threads.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">{tab === "active" ? "No conversations yet. Message a landlord from any listing to start one." : "No archived conversations."}</p>
          : <ul className="grid gap-1 p-2">{threads.map(t => { const thumbUrl = t.listingThumbnailUrl ?? t.listingPhotoUrl ?? null; return <li key={t.id}>
            <button type="button" onClick={() => select(t.id)} aria-current={t.id === selectedId ? "true" : undefined}
              className={`grid w-full grid-cols-[3.5rem_minmax(0,1fr)] gap-3 rounded-xl p-2 text-left ${focusRing} ${t.id === selectedId ? "bg-action/10" : "hover:bg-muted"}`}>
              <span className="grid size-14 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                {thumbUrl ? <Image src={thumbUrl} alt="" width={56} height={56} unoptimized className="size-14 object-cover" /> : <Home size={22} aria-hidden="true" />}
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{t.listingTitle}</span>
                  {t.unreadCount > 0 && <><span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-action" /><span aria-label={`${t.unreadCount} unread`} className="ml-auto shrink-0 rounded-full bg-action px-1.5 text-xs font-bold leading-5 text-action-foreground">{t.unreadCount > 99 ? "99+" : t.unreadCount}</span></>}
                </span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><span className="truncate">{t.counterpart.fullName ?? "AbangCebu user"}</span><Badge variant="outline" className="px-1.5 py-0 capitalize">{t.counterpart.role}</Badge></span>
                <span className="truncate text-xs text-muted-foreground">{t.lastMessagePreview ?? "No messages yet"}</span>
                <span className="flex items-center justify-between gap-2 text-xs"><Badge variant={listingBadgeLabel(t) === "Published · Available" ? "default" : "secondary"} className="truncate px-1.5 py-0">{listingBadgeLabel(t)}</Badge><time dateTime={t.lastMessageAt ?? undefined} className="shrink-0 text-muted-foreground">{formatMessageTime(t.lastMessageAt)}</time></span>
              </span>
            </button>
          </li>; })}</ul>}
      </div>
    </aside>

    <section aria-label="Conversation" className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col`}>
      {!selectedId || !thread ? (selectedId && detailError ? <div role="alert" className="grid gap-3 p-6 text-sm"><Button variant="outline" onClick={() => select(null)}>Back to messages</Button><p>{detailError}</p></div>
        : selectedId ? <div className="grid gap-3 p-4" role="status" aria-label="Loading conversation">{[0, 1, 2].map(i => <Skeleton key={i} className={`h-14 ${i % 2 ? "ml-auto w-2/3" : "w-3/4"}`} />)}</div>
        : <div className="m-auto grid justify-items-center gap-2 p-8 text-center text-muted-foreground"><MessageSquare size={32} aria-hidden="true" /><p className="text-sm">Select a conversation to read it.</p></div>)
      : <>
        <header className="sticky top-0 z-10 grid gap-2 border-b border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => select(null)}><ArrowLeft size={18} aria-hidden="true" />Back to messages</Button>
            <div className="min-w-0 flex-1"><h2 className="truncate text-base font-semibold">{thread.counterpart.fullName ?? "AbangCebu user"}</h2><p className="text-xs capitalize text-muted-foreground">{thread.counterpart.role}</p></div>
            <div className="flex flex-wrap gap-1">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void setArchived(!thread.isArchived)}>{thread.isArchived ? <ArchiveRestore size={16} aria-hidden="true" /> : <Archive size={16} aria-hidden="true" />}{thread.isArchived ? "Unarchive" : "Archive"}</Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => thread.blockedByViewer ? void setBlocked(false) : setBlockOpen(true)}><Ban size={16} aria-hidden="true" />{thread.blockedByViewer ? "Unblock user" : "Block user"}</Button>
              <Button variant="outline" size="sm" onClick={() => setReportTarget({ targetType: "conversation" })}><Flag size={16} aria-hidden="true" />Report</Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 p-2 text-sm">
            <Link href={listingHref(thread, userRole)} className={`min-w-0 truncate font-semibold underline-offset-2 hover:underline ${focusRing}`}>{thread.listingTitle}</Link>
            {thread.listingPrice != null && <span className="text-muted-foreground">₱{Number(thread.listingPrice).toLocaleString("en-PH")}/month</span>}
            <Badge variant={listingBadgeLabel(thread) === "Published · Available" ? "default" : "secondary"} className="ml-auto">{listingBadgeLabel(thread)}</Badge>
          </div>
        </header>

        <div ref={scrollRef} onScroll={e => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} className="min-h-0 flex-1 overflow-y-auto p-3">
          {hasMore && <div className="mb-3 grid"><Button variant="outline" size="sm" disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? "Loading…" : "Load older messages"}</Button></div>}
          {detailLoading && !messages.length ? <div className="grid gap-3" role="status" aria-label="Loading messages">{[0, 1, 2].map(i => <Skeleton key={i} className={`h-14 ${i % 2 ? "ml-auto w-2/3" : "w-3/4"}`} />)}</div>
            : detailError && !messages.length ? <p role="alert" className="text-sm">{detailError}</p>
            : <ol className="grid gap-2">
              {messages.map(m => <MessageItem key={m.id} message={m} mine={m.senderId === userId} onReport={() => setReportTarget({ targetType: "message", messageId: m.id })} />)}
              {outbox.map(o => <li key={o.operationId} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl border border-dashed border-border px-3 py-2 text-sm">
                  <p className="whitespace-pre-wrap break-words">{o.body}</p>
                  {o.status === "sending" ? <p className="mt-1 text-[.7rem] text-muted-foreground">Sending…</p>
                    : <div role="alert" className="mt-1 flex items-center gap-2 text-xs text-destructive"><span>Message wasn&apos;t sent</span><Button variant="outline" size="sm" className="min-h-9" onClick={() => void deliver(o)}>Retry</Button></div>}
                </div>
              </li>)}
            </ol>}
        </div>

        <form onSubmit={send} className="grid gap-2 border-t border-border bg-card p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))]">
          {blockedReason && <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{blockedReason}</p>}
          <label htmlFor="message-composer" className="sr-only">Message</label>
          <textarea id="message-composer" value={draft} onChange={e => setDraft(e.target.value)} disabled={!thread.canSend} maxLength={MESSAGE_MAX} rows={2} placeholder="Write a message"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            className={`min-h-11 w-full resize-none rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`} />
          <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{draft.length}/{MESSAGE_MAX}</span>
            <Button type="submit" disabled={!thread.canSend || sending || !draft.trim()}>{sending ? "Sending…" : "Send"}</Button></div>
        </form>

        <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title="Block this user?" description="You and this user won't be able to send new messages in your shared conversations. Past messages stay readable.">
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setBlockOpen(false)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => void setBlocked(true)}>Block user</Button></div>
        </Modal>
        {reportTarget && <ReportDialog thread={thread} userId={userId} targetType={reportTarget.targetType} messageId={reportTarget.messageId} onClose={() => setReportTarget(null)} onDone={blocked => { setReportTarget(null); if (blocked) void openThread(thread.id); }} />}
      </>}
    </section>
  </div>;
}

export function MessageItem({ message: m, mine, onReport }: { message: RentalMessageItem; mine: boolean; onReport: () => void }) {
  return <li className={`flex items-end gap-1 ${mine ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-action text-action-foreground" : "bg-muted text-foreground"}`}>
      <p className="whitespace-pre-wrap break-words">{m.body}</p>
      <time dateTime={m.createdAt} className="mt-1 block text-[.7rem] opacity-70">{formatMessageTime(m.createdAt)}</time>
    </div>
    {!mine && <Button variant="ghost" size="sm" aria-label="Report message" className="size-9 min-h-9 p-0" onClick={onReport}><Flag size={14} aria-hidden="true" /></Button>}
  </li>;
}

function ReportDialog({ thread, userId, targetType, messageId, onClose, onDone }: { thread: RentalThreadDetail; userId: string; targetType: "conversation" | "message"; messageId?: string; onClose: () => void; onDone: (blocked: boolean) => void }) {
  const [category, setCategory] = useState<ReportCategory>("scam_or_fraud");
  const [details, setDetails] = useState("");
  const [blockUser, setBlockUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operationId = useRef(newId()); // stable across retries so the server can dedupe
  const length = details.trim().length;
  const valid = length >= REPORT_DETAILS_MIN && length <= REPORT_DETAILS_MAX;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiJson<unknown>("/api/reports", userId, { method: "POST", body: JSON.stringify({ operationId: operationId.current, targetType, conversationId: thread.id, ...(messageId ? { messageId } : {}), category, details: details.trim(), blockUser }) });
      notify("success", "messages-report", "Report sent. Thanks for helping keep AbangCebu safe.");
      onDone(blockUser);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't send the report.";
      setError(message);
      notify("error", "messages-report", message);
    } finally { setSubmitting(false); }
  }

  return <Modal open onClose={onClose} title={targetType === "message" ? "Report message" : "Report conversation"} description="Tell us what happened. Our team reviews the conversation." className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium">Reason
        <Select aria-label="Report reason" value={category} onValueChange={value => setCategory(value as ReportCategory)} options={REPORT_CATEGORIES} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">Details
        <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={REPORT_DETAILS_MAX} rows={4} aria-invalid={length > 0 && !valid}
          className={`w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-foreground ${focusRing}`} />
        <span className="text-xs font-normal text-muted-foreground">{length}/{REPORT_DETAILS_MAX} · at least {REPORT_DETAILS_MIN} characters</span>
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={blockUser} onChange={e => setBlockUser(e.target.checked)} className="size-4" />Also block this user</label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!valid || submitting}>{submitting ? "Sending…" : "Send report"}</Button></div>
    </form>
  </Modal>;
}
