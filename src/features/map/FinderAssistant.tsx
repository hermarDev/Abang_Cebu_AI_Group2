"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { History, LoaderCircle, Plus, Send, Trash2, X } from "lucide-react";
import styles from "./RestoredFinderShell.module.css";

type ChatMessage = { role: "user" | "assistant"; content: string };
type AssistantResponse = { reply?: unknown; error?: unknown };
type SavedConversation = {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  localOnly?: boolean;
};
type ConversationResponse = { conversation?: unknown; conversations?: unknown; error?: unknown; success?: unknown };
type ReplyBlock =
  | { type: "paragraph"; content: string }
  | { type: "ordered" | "unordered"; items: string[] };

const LOCAL_HISTORY_KEY = "abangcebu-assistant-history-v1";
const MAX_LOCAL_CONVERSATIONS = 20;
const MAX_SAVED_MESSAGES = 120;
const MAX_SAVED_BYTES = 60_000;
const MAX_USER_MESSAGE_LENGTH = 2_000;
const MAX_ASSISTANT_MESSAGE_LENGTH = 8_000;
const MAX_CONTEXT_MESSAGES = 16;
const MAX_CONTEXT_BYTES = 12_000;

const welcomeMessage: ChatMessage = {
  role: "assistant",
  content: "Hi! Tell me your preferred area and monthly budget, and I’ll help you narrow your Cebu rental search.",
};

function renderInlineFormatting(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{part.replace(/\*\*/g, "")}</Fragment>;
  });
}

function renderReply(content: string): ReactNode[] {
  const lines = content.replace(/\r\n?/g, "\n").replace(/([^\n])\s+(?=\d+[.)]\s+)/g, "$1\n").replace(/([^\n])\s+(?=[-*•]\s+)/g, "$1\n").trim().split("\n");
  const blocks: ReplyBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    const unordered = /^[-*•]\s+(.+)$/.exec(line);
    if (ordered || unordered) {
      const type = ordered ? "ordered" : "unordered";
      const items: string[] = [];
      while (index < lines.length) {
        const itemLine = lines[index].trim();
        const match = type === "ordered"
          ? /^\d+[.)]\s+(.+)$/.exec(itemLine)
          : /^[-*•]\s+(.+)$/.exec(itemLine);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type, items });
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length) {
      const nextLine = lines[index].trim();
      if (!nextLine || /^\d+[.)]\s+/.test(nextLine) || /^[-*•]\s+/.test(nextLine)) break;
      paragraph.push(nextLine);
      index += 1;
    }
    blocks.push({ type: "paragraph", content: paragraph.join(" ").replace(/^#{1,6}\s+/, "") });
  }

  return blocks.map((block, blockIndex) => {
    if (block.type === "paragraph") {
      return <p key={blockIndex}>{renderInlineFormatting(block.content)}</p>;
    }
    const items = block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineFormatting(item)}</li>);
    return block.type === "ordered"
      ? <ol key={blockIndex}>{items}</ol>
      : <ul key={blockIndex}>{items}</ul>;
  });
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message = value as { role?: unknown; content?: unknown };
  return (message.role === "user" || message.role === "assistant")
    && typeof message.content === "string"
    && !!message.content.trim()
    && message.content.length <= (message.role === "user" ? MAX_USER_MESSAGE_LENGTH : MAX_ASSISTANT_MESSAGE_LENGTH);
}

function validateMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_SAVED_MESSAGES || !value.every(isChatMessage)) return null;
  const messages = value.map((message) => ({ role: message.role, content: message.content.trim() }));
  const serializedBytes = new TextEncoder().encode(JSON.stringify(messages)).byteLength;
  return serializedBytes <= MAX_SAVED_BYTES && messages.some((message) => message.role === "user") ? messages : null;
}

function fitStoredMessages(messages: ChatMessage[]) {
  let fitted = messages.slice(-MAX_SAVED_MESSAGES);
  while (fitted.length > 2 && new TextEncoder().encode(JSON.stringify(fitted)).byteLength > MAX_SAVED_BYTES) {
    fitted = fitted.slice(1);
  }
  return fitted;
}

function assistantContext(messages: ChatMessage[]) {
  let context = messages.slice(-MAX_CONTEXT_MESSAGES).map((message) => ({
    role: message.role,
    content: message.role === "assistant" ? message.content.slice(-MAX_USER_MESSAGE_LENGTH) : message.content,
  }));
  while (context.length > 1 && new TextEncoder().encode(JSON.stringify(context)).byteLength > MAX_CONTEXT_BYTES) {
    context = context.slice(1);
  }
  return context;
}

function makeConversation(messages: ChatMessage[], existing?: SavedConversation, localOnly = existing?.localOnly): SavedConversation {
  const normalizedMessages = messages.map((message) => ({ role: message.role, content: message.content }));
  const firstQuestion = normalizedMessages.find((message) => message.role === "user")?.content.replace(/\s+/g, " ").trim() ?? "New chat";
  const lastMessage = normalizedMessages.at(-1);
  const sender = lastMessage?.role === "assistant" ? "AbangCebu assistant" : "You";
  const preview = `${sender}: ${lastMessage?.content.replace(/\s+/g, " ").trim() ?? ""}`.trim();
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    title: existing?.title ?? firstQuestion.slice(0, 60),
    preview: preview.slice(0, 140),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    messages: normalizedMessages,
    localOnly,
  };
}

function readLocalHistory(storageKey: string, localOnly = false): SavedConversation[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value): SavedConversation[] => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const candidate = value as Partial<SavedConversation>;
      const messages = validateMessages(candidate.messages);
      if (!messages || typeof candidate.id !== "string" || typeof candidate.createdAt !== "string" || typeof candidate.updatedAt !== "string") return [];
      const conversation = makeConversation(messages, {
        id: candidate.id,
        title: typeof candidate.title === "string" ? candidate.title.slice(0, 80) : "New chat",
        preview: typeof candidate.preview === "string" ? candidate.preview.slice(0, 140) : "",
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
      }, localOnly);
      return [conversation];
    }).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, MAX_LOCAL_CONVERSATIONS);
  } catch {
    return [];
  }
}

function persistLocalHistory(storageKey: string, conversations: SavedConversation[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(conversations.slice(0, MAX_LOCAL_CONVERSATIONS)));
    return true;
  } catch {
    return false;
  }
}

function mergeConversations(...groups: SavedConversation[][]) {
  const unique = new Map<string, SavedConversation>();
  for (const conversation of groups.flat()) unique.set(conversation.id, conversation);
  return [...unique.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 50);
}

function errorFrom(result: ConversationResponse, fallback: string) {
  return typeof result.error === "string" ? result.error : fallback;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function ProfileAvatar({ url, name, className }: { url: string | null; name: string; className: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  return <span className={className} aria-hidden="true">
    <span>{initial}</span>
    {url && <Image src={url} alt="" width={36} height={36} unoptimized onError={(event) => { event.currentTarget.style.display = "none"; }} />}
  </span>;
}

export function FinderAssistant({ open, onOpenChange: setOpen, onSearch, onFilters, onControlsTargetChange, onSignIn = () => {}, authenticated = false, userId = null, displayName = null, profilePhotoUrl = null }: { open: boolean; onOpenChange: (open: boolean) => void; onSearch: () => void; onFilters: () => void; onControlsTargetChange: (target: HTMLDivElement | null) => void; onSignIn?: () => void; authenticated?: boolean; userId?: string | null; displayName?: string | null; profilePhotoUrl?: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isAccountFallback, setIsAccountFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const conversationsRef = useRef<SavedConversation[]>([]);
  const activeConversationIdRef = useRef<string | null>(null);
  const activeConversationLocalRef = useRef(false);
  const accountSyncUnavailable = useRef(false);
  const loadedHistoryFor = useRef<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const localHistoryKey = userId ? `${LOCAL_HISTORY_KEY}:account:${userId}` : `${LOCAL_HISTORY_KEY}:guest`;
  const historyOwner = authenticated ? userId ?? "signed-in" : "guest";

  const updateConversations = useCallback((next: SavedConversation[] | ((current: SavedConversation[]) => SavedConversation[])) => {
    const value = typeof next === "function" ? next(conversationsRef.current) : next;
    conversationsRef.current = value;
    setConversations(value);
  }, []);

  const updateActiveConversationId = useCallback((id: string | null) => {
    activeConversationIdRef.current = id;
    setActiveConversationId(id);
  }, []);

  const updateActiveConversationLocal = useCallback((isLocal: boolean) => {
    activeConversationLocalRef.current = isLocal;
  }, []);

  useEffect(() => {
    if (!open || loadedHistoryFor.current === historyOwner) return;
    let cancelled = false;

    async function loadHistory() {
      await Promise.resolve();
      if (cancelled) return;
      setIsLoadingHistory(true);
      setHistoryError(null);
      setIsAccountFallback(false);
      updateActiveConversationId(null);
      updateActiveConversationLocal(false);
      updateConversations([]);
      setMessages([welcomeMessage]);
      accountSyncUnavailable.current = false;

      if (!authenticated) {
        const localConversations = readLocalHistory(localHistoryKey);
        if (cancelled) return;
        updateConversations(localConversations);
        const latest = localConversations[0];
        if (latest?.messages) {
          setMessages(latest.messages);
          updateActiveConversationId(latest.id);
          updateActiveConversationLocal(false);
        }
        loadedHistoryFor.current = historyOwner;
        setIsLoadingHistory(false);
        return;
      }

      try {
        const response = await fetch("/api/assistant/conversations", { cache: "no-store" });
        const result = await response.json() as ConversationResponse;
        if (!response.ok) throw new Error(errorFrom(result, "Saved chats are unavailable right now."));
        const summaries = Array.isArray(result.conversations) ? result.conversations.flatMap((item): SavedConversation[] => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return [];
          const summary = item as Partial<SavedConversation>;
          if (typeof summary.id !== "string" || typeof summary.title !== "string" || typeof summary.updatedAt !== "string") return [];
          return [{ id: summary.id, title: summary.title, preview: typeof summary.preview === "string" ? summary.preview : "", createdAt: typeof summary.createdAt === "string" ? summary.createdAt : summary.updatedAt, updatedAt: summary.updatedAt }];
        }) : [];
        if (cancelled) return;
        const localConversations = userId ? readLocalHistory(localHistoryKey, true) : [];
        const allConversations = mergeConversations(summaries, localConversations);
        updateConversations(allConversations);
        const latest = allConversations[0];
        if (!latest) {
          loadedHistoryFor.current = historyOwner;
          return;
        }

        if (latest.localOnly && latest.messages) {
          setMessages(latest.messages);
          updateActiveConversationId(latest.id);
          updateActiveConversationLocal(true);
          loadedHistoryFor.current = historyOwner;
          return;
        }

        const conversationResponse = await fetch(`/api/assistant/conversations?id=${encodeURIComponent(latest.id)}`, { cache: "no-store" });
        const conversationResult = await conversationResponse.json() as ConversationResponse;
        if (!conversationResponse.ok || !conversationResult.conversation || typeof conversationResult.conversation !== "object") {
          throw new Error(errorFrom(conversationResult, "Your latest chat could not be opened."));
        }
        const saved = conversationResult.conversation as Partial<SavedConversation>;
        const savedMessages = validateMessages(saved.messages);
        if (!savedMessages || typeof saved.id !== "string") throw new Error("Your latest chat could not be opened.");
        if (cancelled) return;
        setMessages(savedMessages);
        updateActiveConversationId(saved.id);
        updateActiveConversationLocal(false);
        updateConversations((current) => current.map((conversation) => conversation.id === saved.id ? { ...conversation, messages: savedMessages } : conversation));
        loadedHistoryFor.current = historyOwner;
      } catch {
        if (!cancelled) {
          const localConversations = userId ? readLocalHistory(localHistoryKey, true) : [];
          updateConversations((current) => mergeConversations(current, localConversations));
          if (localConversations[0]?.messages) {
            setMessages(localConversations[0].messages);
            updateActiveConversationId(localConversations[0].id);
            updateActiveConversationLocal(true);
          }
          accountSyncUnavailable.current = true;
          setIsAccountFallback(true);
          loadedHistoryFor.current = historyOwner;
          setHistoryError(userId
            ? "Account sync isn't set up yet. Chats stay on this device."
            : "Account sync isn't set up yet.");
        }
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    }

    void loadHistory();
    return () => { cancelled = true; };
  }, [authenticated, historyOwner, localHistoryKey, open, updateActiveConversationId, updateActiveConversationLocal, updateConversations, userId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending, open, historyOpen]);

  function saveLocally(nextMessages: ChatMessage[]) {
    const validatedMessages = validateMessages(nextMessages);
    if (!validatedMessages) return;
    if (authenticated && !userId) {
      setIsAccountFallback(true);
      setHistoryError("Your account could not be identified, so this chat cannot be saved safely.");
      return;
    }

    const activeId = activeConversationIdRef.current;
    const existing = conversationsRef.current.find((conversation) => conversation.id === activeId && (!authenticated || conversation.localOnly));
    const updated = makeConversation(validatedMessages, existing, authenticated ? true : false);
    const nextConversations = [updated, ...conversationsRef.current.filter((conversation) => conversation.id !== updated.id)]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, authenticated ? 50 : MAX_LOCAL_CONVERSATIONS);
    updateConversations(nextConversations);
    const localConversations = authenticated ? nextConversations.filter((conversation) => conversation.localOnly).slice(0, MAX_LOCAL_CONVERSATIONS) : nextConversations;
    if (!persistLocalHistory(localHistoryKey, localConversations)) setHistoryError("This browser could not save chat history. Check its storage settings.");
    else if (authenticated) {
      setIsAccountFallback(true);
      setHistoryError("Account sync isn't set up yet. Chats stay on this device.");
    }
    updateActiveConversationId(updated.id);
    updateActiveConversationLocal(authenticated);
  }

  async function saveConversation(nextMessages: ChatMessage[]) {
    const validatedMessages = validateMessages(nextMessages);
    if (!validatedMessages) return;

    if (!authenticated || accountSyncUnavailable.current) {
      saveLocally(validatedMessages);
      return;
    }

    const activeId = activeConversationIdRef.current;
    const activeIsLocal = activeConversationLocalRef.current;
    const isNew = !activeId || activeIsLocal;
    try {
      const response = await fetch("/api/assistant/conversations", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? { messages: validatedMessages } : { id: activeId, messages: validatedMessages }),
      });
      const result = await response.json() as ConversationResponse;
      if (!response.ok || !result.conversation || typeof result.conversation !== "object") {
        throw new Error(errorFrom(result, "Your chat could not be saved."));
      }
      const saved = result.conversation as Partial<SavedConversation>;
      if (typeof saved.id !== "string" || typeof saved.title !== "string" || typeof saved.updatedAt !== "string") throw new Error("Your chat could not be saved.");
      const conversation: SavedConversation = {
        id: saved.id,
        title: saved.title,
        preview: typeof saved.preview === "string" ? saved.preview : "",
        createdAt: typeof saved.createdAt === "string" ? saved.createdAt : saved.updatedAt,
        updatedAt: saved.updatedAt,
        messages: validatedMessages,
      };
      accountSyncUnavailable.current = false;
      setIsAccountFallback(false);
      updateActiveConversationId(conversation.id);
      updateActiveConversationLocal(false);
      updateConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id && !(activeIsLocal && item.id === activeId))].slice(0, 50));
      if (userId) persistLocalHistory(localHistoryKey, conversationsRef.current.filter((item) => item.localOnly).slice(0, MAX_LOCAL_CONVERSATIONS));
      setHistoryError(null);
    } catch {
      if (authenticated && userId) {
        accountSyncUnavailable.current = true;
        setIsAccountFallback(true);
        saveLocally(validatedMessages);
      } else {
        setHistoryError("Your chat could not be saved.");
      }
    }
  }

  async function selectConversation(conversation: SavedConversation) {
    setError(null);
    setHistoryError(null);
    setPendingDeleteId(null);
    setHistoryLoading(true);
    if ((!authenticated || conversation.localOnly) && conversation.messages) {
      setMessages(conversation.messages);
      updateActiveConversationId(conversation.id);
      updateActiveConversationLocal(authenticated && !!conversation.localOnly);
      setHistoryOpen(false);
      setHistoryLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/assistant/conversations?id=${encodeURIComponent(conversation.id)}`, { cache: "no-store" });
      const result = await response.json() as ConversationResponse;
      if (!response.ok || !result.conversation || typeof result.conversation !== "object") throw new Error(errorFrom(result, "This chat could not be opened."));
      const saved = result.conversation as Partial<SavedConversation>;
      const savedMessages = validateMessages(saved.messages);
      if (!savedMessages || typeof saved.id !== "string") throw new Error("This chat could not be opened.");
      setMessages(savedMessages);
      updateActiveConversationId(saved.id);
      updateActiveConversationLocal(false);
      updateConversations((current) => current.map((item) => item.id === saved.id ? { ...item, messages: savedMessages } : item));
      setHistoryOpen(false);
    } catch {
      accountSyncUnavailable.current = true;
      setIsAccountFallback(true);
      setHistoryError("Couldn't open this account chat right now. Your current chat is unchanged.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function startNewChat() {
    setMessages([welcomeMessage]);
    updateActiveConversationId(null);
    updateActiveConversationLocal(false);
    setDraft("");
    setError(null);
    setHistoryError(null);
    setHistoryOpen(false);
    setPendingDeleteId(null);
  }

  async function deleteConversation(conversation: SavedConversation) {
    setHistoryError(null);
    if (authenticated && !conversation.localOnly) {
      try {
        const response = await fetch("/api/assistant/conversations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: conversation.id }),
        });
        const result = await response.json() as ConversationResponse;
        if (!response.ok) throw new Error(errorFrom(result, "This chat could not be deleted."));
      } catch (cause) {
        setHistoryError(cause instanceof Error ? cause.message : "This chat could not be deleted.");
        return;
      }
    }

    const nextConversations = conversationsRef.current.filter((item) => item.id !== conversation.id);
    updateConversations(nextConversations);
    if ((!authenticated || conversation.localOnly) && !persistLocalHistory(localHistoryKey, authenticated ? nextConversations.filter((item) => item.localOnly) : nextConversations)) setHistoryError("This browser could not update chat history.");
    if (activeConversationId === conversation.id) {
      updateActiveConversationId(null);
      updateActiveConversationLocal(false);
      setMessages([welcomeMessage]);
    }
    setPendingDeleteId(null);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending || isLoadingHistory) return;

    const nextMessages = fitStoredMessages([...messages, { role: "user" as const, content }]);
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      await saveConversation(nextMessages);
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: assistantContext(nextMessages) }),
      });
      const result = await response.json() as AssistantResponse;
      if (!response.ok) {
        setError(typeof result.error === "string" ? result.error : "The assistant could not reply just now. Please try again.");
        return;
      }
      if (typeof result.reply !== "string" || !result.reply.trim()) {
        setError("The assistant returned an empty reply. Please try again.");
        return;
      }
      const repliedMessages = fitStoredMessages([...nextMessages, { role: "assistant" as const, content: result.reply.trim() }]);
      setMessages(repliedMessages);
      await saveConversation(repliedMessages);
    } catch {
      setError("The assistant could not connect just now. Check your connection and try again.");
    } finally {
      setIsSending(false);
    }
  }

  return <div className={styles.assistant}>
    {open && <div ref={onControlsTargetChange} className={styles.assistantControlsSlot} />}
    {open && <section className={styles.chatPanel} aria-label="AbangCebu assistant">
      <header className={styles.chatHeader}>
        <Image src="/icons/chatbot_logo.png" alt="" width={36} height={36} />
        <div className={styles.chatIdentity}><b>AbangCebu assistant</b><span>{authenticated ? "Your Cebu rental chats" : "Cebu rental help"}</span></div>
        <div className={styles.chatHeaderActions}>
          <button type="button" onClick={() => { setHistoryOpen((value) => !value); setPendingDeleteId(null); }} aria-label={historyOpen ? "Back to current chat" : "Open chat history"} aria-pressed={historyOpen}><History size={17} /></button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>
        </div>
      </header>
      {historyOpen ? <div className={styles.chatHistory} aria-label="Saved conversations">
        <div className={styles.chatHistoryToolbar}><div><b>Recent chats</b><span>{authenticated ? (isAccountFallback || conversations.some((conversation) => conversation.localOnly) ? "Saved on this device" : "Saved to your account") : "Saved on this browser"}</span></div><button type="button" onClick={startNewChat}><Plus size={16} />New chat</button></div>
        {!authenticated && <div className={styles.chatGuestPrompt}><span>Sign in to access account chats. Guest chats stay on this browser and won’t be moved.</span><button type="button" onClick={onSignIn}>Sign in</button></div>}
        {historyLoading && <p className={styles.chatHistoryStatus} role="status">Opening chat…</p>}
        {!historyLoading && conversations.length === 0 && !historyError && <p className={styles.chatHistoryStatus}>No past chats yet. Start a conversation and it’ll appear here.</p>}
        {historyError && <div className={styles.chatHistoryNotice} role="status">{historyError}</div>}
        <div className={styles.chatHistoryList}>
          {conversations.map((conversation) => <div key={conversation.id} className={styles.chatHistoryItem}>
            <button type="button" className={styles.chatHistoryOpen} onClick={() => { void selectConversation(conversation); }} disabled={historyLoading}>
              <span className={styles.chatHistoryIdentity}><ProfileAvatar url={profilePhotoUrl} name={displayName || "Guest"} className={styles.chatHistoryAvatar} /><b>{displayName || "Guest"}</b></span>
              <span className={styles.chatHistoryPreview}>{conversation.preview || "Start a conversation"}</span><small>{formatDate(conversation.updatedAt)}</small>
            </button>
            {pendingDeleteId === conversation.id ? <div className={styles.chatDeleteConfirm}><span>Delete this chat?</span><button type="button" onClick={() => { void deleteConversation(conversation); }}>Delete</button><button type="button" onClick={() => setPendingDeleteId(null)}>Cancel</button></div>
              : <button type="button" className={styles.chatDeleteButton} aria-label={`Delete ${conversation.title}`} onClick={() => setPendingDeleteId(conversation.id)}><Trash2 size={16} /></button>}
          </div>)}
        </div>
      </div> : <>
        <div className={styles.chatMessages} role="log" aria-live="polite" aria-label="Conversation with AbangCebu assistant">
          {messages.map((message, index) => {
            return message.role === "user"
              ? <div key={`${message.role}-${index}`} className={styles.chatUserMessage}>
                <p className={styles.chatMessageUser}>{message.content}</p>
                <ProfileAvatar url={authenticated ? profilePhotoUrl : null} name={displayName || "You"} className={styles.chatUserAvatar} />
              </div>
              : <div key={`${message.role}-${index}`} className={styles.chatAssistantMessage}>
                <Image src="/icons/chatbot_logo.png" alt="" width={24} height={24} />
                <div className={styles.chatAssistantReply}>{renderReply(message.content)}</div>
              </div>;
          })}
          {messages.length === 1 && <div className={styles.suggestions}>
            <button type="button" onClick={() => { setOpen(false); onSearch(); }}>Search places</button>
            <button type="button" onClick={() => { setOpen(false); onFilters(); }}>Open filters</button>
          </div>}
          {isSending && <p className={styles.chatThinking} role="status" aria-label="Assistant is typing">
            <span className={styles.chatTypingDots} aria-hidden="true"><i /><i /><i /></span>
          </p>}
          {error && <div className={styles.chatError} role="alert">{error}</div>}
          {historyError && <div className={styles.chatHistoryNotice} role="status">{historyError}</div>}
          <div ref={messageEndRef} />
        </div>
        <form className={styles.chatComposer} onSubmit={sendMessage}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about renting in Cebu…"
            aria-label="Message the AbangCebu assistant"
            maxLength={MAX_USER_MESSAGE_LENGTH}
            disabled={isSending || isLoadingHistory}
          />
          <button type="submit" aria-label="Send message" disabled={!draft.trim() || isSending || isLoadingHistory}>
            {isSending ? <LoaderCircle size={18} className={styles.chatSpinner} /> : <Send size={17} />}
          </button>
        </form>
      </>}
    </section>}
  </div>;
}
