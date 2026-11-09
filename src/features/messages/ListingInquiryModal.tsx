"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { notify } from "@/components/ui/AppToaster";
import { MESSAGE_MAX, MessagingApiError, postListingInquiry, type InquiryIntent } from "./messaging-client";

// Survives closing the dialog so an ambiguous failure retried later reuses the same operationId.
const pendingIntents = new Map<string, InquiryIntent>();
export const clearPendingInquiryIntents = () => pendingIntents.clear();

/** Reuse the pending intent only when the exact same text is retried; edited text is a new intent. */
export function resolveInquiryIntent(key: string, listingId: string, body: string, newId = () => globalThis.crypto.randomUUID()): InquiryIntent {
  const pending = pendingIntents.get(key);
  if (pending && pending.body === body) return pending;
  const intent = { operationId: newId(), listingId, body };
  pendingIntents.set(key, intent);
  return intent;
}

const AMBIGUOUS = new Set(["network", "server", "rate_limit"]);

/** Posts the inquiry; keeps the pending intent only when the outcome is ambiguous so a retry reuses its operationId. */
export async function submitInquiry(key: string, userId: string, listingId: string, body: string, fetchImpl?: typeof fetch) {
  const intent = resolveInquiryIntent(key, listingId, body);
  try {
    const result = await postListingInquiry(userId, intent, fetchImpl);
    pendingIntents.delete(key);
    return { conversationId: result.conversationId, error: null };
  } catch (caught) {
    if (!(caught instanceof MessagingApiError && caught.kind && AMBIGUOUS.has(caught.kind))) pendingIntents.delete(key);
    return { conversationId: null, error: caught instanceof Error ? caught.message : "Something went wrong. Please try again." };
  }
}

export function ListingInquiryModal({ listingId, listingTitle, userId, onClose, surface, fetchImpl }: { listingId: string; listingTitle: string; userId: string; onClose: () => void; surface?: "finder"; fetchImpl?: typeof fetch }) {
  const key = `${userId}:${listingId}`;
  const [draft, setDraft] = useState(pendingIntents.get(key)?.body ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const body = draft.trim();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body || body.length > MESSAGE_MAX || sending) return;
    setSending(true);
    setError(null);
    const result = await submitInquiry(key, userId, listingId, body, fetchImpl);
    setSending(false);
    setError(result.error);
    if (result.conversationId) {
      setConversationId(result.conversationId);
      notify("success", `inquiry-${listingId}`, "Message sent to the landlord.");
    }
  }

  return <Modal open onClose={onClose} surface={surface} title="Message landlord" description={`About ${listingTitle}`}>
    {conversationId ? <div className="grid gap-3">
      <p role="status" className="m-0 text-sm">Your message was sent. The landlord’s reply will appear in your messages.</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Continue browsing</Button>
        <Link href={`/messages?thread=${encodeURIComponent(conversationId)}`} className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius)] bg-action px-4 text-sm font-medium text-action-foreground hover:bg-action-hover">View conversation</Link>
      </div>
    </div> : <form onSubmit={(event) => void submit(event)} className="grid gap-3">
      <label htmlFor="listing-inquiry-body" className="sr-only">Message</label>
      <textarea id="listing-inquiry-body" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={MESSAGE_MAX} rows={5} disabled={sending} placeholder="Ask about availability, viewing times or house rules"
        className="min-h-11 w-full resize-none rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" />
      {error && <p role="alert" className="m-0 text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{draft.length}/{MESSAGE_MAX}</span>
        <div className="flex gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={sending || !body}>{sending ? "Sending…" : error ? "Retry" : "Send message"}</Button></div>
      </div>
    </form>}
  </Modal>;
}
