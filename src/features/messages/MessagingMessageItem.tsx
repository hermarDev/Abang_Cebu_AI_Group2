"use client";

import { memo, useRef, useState, type FormEvent } from "react";
import { CornerUpLeft, Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { notify } from "@/components/ui/AppToaster";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  Bubble,
  BubbleAttachments,
  BubbleContent,
  BubbleGroup,
  BubbleQuote,
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@/components/ui/chat";
import {
  REPORT_CATEGORIES,
  REPORT_DETAILS_MAX,
  REPORT_DETAILS_MIN,
  apiJson,
  formatMessageTime,
  type RentalMessageItem,
  type RentalThreadDetail,
  type ReportCategory,
} from "./messaging-client";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function getInitials(name?: string | null): string {
  if (!name) return "AC";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function formatDateSeparator(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function shouldShowMarker(currentMsg: RentalMessageItem, prevMsg: RentalMessageItem | null): boolean {
  if (!prevMsg) return true;
  return !isSameDay(new Date(currentMsg.createdAt), new Date(prevMsg.createdAt));
}

export const MessageItem = memo(function MessageItem({
  message: m,
  mine,
  onReport,
  onReply,
  onJumpToMessage,
  onPhotoClick,
  counterpart,
  showAvatar = true,
}: {
  message: RentalMessageItem;
  mine: boolean;
  onReport: (messageId: string) => void;
  onReply?: (m: RentalMessageItem) => void;
  onJumpToMessage?: (id: string) => void;
  onPhotoClick?: (url: string) => void;
  counterpart?: { fullName: string | null; avatarUrl: string | null } | null;
  showAvatar?: boolean;
}) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipingRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipingRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      if (!swipingRef.current && onReply) {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(25);
        onReply(m);
      }
    }, 550);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    if (!swipingRef.current) {
      if (Math.abs(dy) > Math.abs(dx)) return;
      if (dx > 10) swipingRef.current = true;
    }

    if (swipingRef.current && dx > 0) {
      const clamped = Math.min(dx * 0.7, 80);
      setSwipeOffset(clamped);
      if (clamped >= 60 && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (swipeOffset >= 60 && onReply) {
      onReply(m);
    }
    setSwipeOffset(0);
    touchStartRef.current = null;
    swipingRef.current = false;
  };

  return (
    <Message id={`message-${m.id}`} mine={mine} className="rounded-xl transition-all">
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
          <div
            className="group relative flex items-center gap-1.5"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {swipeOffset > 0 && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 text-action pointer-events-none transition-opacity"
                style={{ opacity: Math.min(swipeOffset / 50, 1) }}
              >
                <CornerUpLeft size={18} aria-hidden="true" />
              </div>
            )}
            <div
              style={{
                transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
                transition: swipeOffset === 0 ? "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)" : "none",
              }}
              className="max-w-full"
            >
              <Bubble
                mine={mine}
                hasAttachmentOnly={Boolean(m.attachments && m.attachments.length > 0 && !m.body && !m.replyTo)}
              >
                {m.replyTo && (
                  <BubbleQuote
                    author={m.replyTo.senderName}
                    body={m.replyTo.body}
                    attachments={m.replyTo.attachments}
                    mine={mine}
                    isUnavailable={m.replyTo.isUnavailable}
                    onJump={() => onJumpToMessage?.(m.replyTo!.id)}
                  />
                )}
                {m.attachments && m.attachments.length > 0 && (
                  <BubbleAttachments
                    attachments={m.attachments}
                    onPhotoClick={(idx) => {
                      const url = m.attachments?.[idx]?.url;
                      if (url) onPhotoClick?.(url);
                    }}
                  />
                )}
                {m.body && <BubbleContent>{m.body}</BubbleContent>}
              </Bubble>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              {onReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Reply to message"
                  className="size-7 min-h-7 p-0 text-muted-foreground hover:text-foreground focus-visible:opacity-100"
                  onClick={() => onReply(m)}
                >
                  <CornerUpLeft size={13} aria-hidden="true" />
                </Button>
              )}
              {!mine && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Report message"
                  className="size-7 min-h-7 p-0 text-muted-foreground opacity-80 group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
                  onClick={() => onReport(m.id)}
                >
                  <Flag size={13} aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </BubbleGroup>
        <MessageFooter className={mine ? "justify-end" : "justify-start"}>
          <time dateTime={m.createdAt}>
            {formatMessageTime(m.createdAt)}
            {mine ? " · Sent" : ""}
          </time>
        </MessageFooter>
      </MessageContent>
    </Message>
  );
});

export function ReportDialog({
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
  const operationId = useRef(globalThis.crypto.randomUUID());
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
