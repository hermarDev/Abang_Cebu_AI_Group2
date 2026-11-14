import { normalizeApiError, type ApiErrorKind } from "@/lib/api-error";

export type ThreadCounterpart = { id: string; fullName: string | null; avatarUrl: string | null; role: "renter" | "landlord" | "admin"; isSuspended?: boolean };
export type RentalThreadAgreement = {
  id?: string;
  unitId?: string | null;
  unitNumber?: string | null;
  status?: "pending_both" | "renter_agreed" | "landlord_agreed" | "agreed" | "cancelled";
  renterAgreed?: boolean;
  landlordAgreed?: boolean;
  bothAgreed?: boolean;
  renterName?: string | null;
};
export type RentalThreadUnit = {
  id: string;
  unitNumber: string;
  isAvailable: boolean;
  monthlyRent?: number;
};
export type RentalThreadSummary = {
  id: string;
  listingSource?: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number | null;
  listingAddress?: string | null;
  listingCity?: string | null;
  listingStatus: string;
  listingAvailable: boolean;
  listingThumbnailUrl?: string | null;
  listingPhotoUrl?: string | null;
  counterpart: ThreadCounterpart;
  /** The listing's owner (landlord). Independent of the viewer; `counterpart` is the other chat participant and must not be used for "Listed by". `null` = owner profile missing; `undefined` = older server response. */
  listingOwner?: ThreadCounterpart | null;
  unreadCount: number;
  isArchived: boolean;
  isBlocked: boolean;
  blockedByViewer: boolean;
  canSend: boolean;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt?: string;
  agreement?: RentalThreadAgreement | null;
  availableUnits?: RentalThreadUnit[];
};
export type RentalThreadDetail = RentalThreadSummary;
export type RentalMessageAttachment = {
  id?: string;
  storagePath?: string;
  url?: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
};
export type RentalQuotedMessage = {
  id: string;
  senderId?: string;
  senderName: string;
  body: string;
  isUnavailable?: boolean;
  attachments?: RentalMessageAttachment[];
};
export type RentalMessageItem = {
  id: string;
  conversationId: string;
  senderId: string;
  operationId: string;
  body: string;
  createdAt: string;
  replyTo?: RentalQuotedMessage | null;
  attachments?: RentalMessageAttachment[];
};
export type ThreadDetailResponse = { thread: RentalThreadDetail; messages: RentalMessageItem[]; hasMore: boolean };
export type ReportCategory = "scam_or_fraud" | "harassment" | "inaccurate_listing" | "off_platform_payment" | "spam" | "other";

export const MESSAGE_MAX = 2000;
export const REPORT_DETAILS_MIN = 10;
export const REPORT_DETAILS_MAX = 1000;
export const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: "scam_or_fraud", label: "Scam or fraud" },
  { value: "harassment", label: "Harassment" },
  { value: "inaccurate_listing", label: "Inaccurate listing" },
  { value: "off_platform_payment", label: "Off-platform payment request" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Something else" },
];

export const isListingGone = (t: Pick<RentalThreadSummary, "listingStatus" | "listingAvailable">) => t.listingStatus === "archived" || t.listingStatus === "removed" || !t.listingAvailable;

export const listingBadgeLabel = (t: Pick<RentalThreadSummary, "listingStatus" | "listingAvailable">) => isListingGone(t) ? "Listing no longer available" : "Published · Available";

export function composerBlockedReason(t: RentalThreadDetail): string | null {
  if (t.canSend) return null;
  if (t.blockedByViewer) return "You blocked this user";
  if (t.listingStatus === "archived" || t.listingStatus === "removed") return "Listing no longer available";
  return "This conversation is unavailable";
}

export const listingHref = (t: Pick<RentalThreadSummary, "listingId">, role: "renter" | "landlord") =>
  `${role === "renter" ? "/" : "/landlord/map"}?selected=${encodeURIComponent(t.listingId)}`;

const time = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
export const formatMessageTime = (iso: string | null | undefined) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? time.format(date) : "";
};

/** Merge by id, keep chronological order. */
export function mergeMessages(existing: RentalMessageItem[], incoming: RentalMessageItem[]) {
  const byId = new Map(existing.map(m => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export class MessagingApiError extends Error {
  constructor(message: string, readonly kind?: ApiErrorKind) { super(message); }
}

export async function apiJson<T>(url: string, userId: string, init: RequestInit = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  let response: Response;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  try {
    response = await fetchImpl(url, {
      cache: "no-store",
      ...init,
      headers: {
        "x-expected-user-id": userId,
        ...(init.body && !isFormData ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    const { message, kind } = normalizeApiError(0, null, "Check your connection and try again.");
    throw new MessagingApiError(message, kind);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const { message, kind } = normalizeApiError(response.status, payload, "Something went wrong. Please try again.");
    throw new MessagingApiError(message, kind);
  }
  return payload as T;
}

/** The same operationId is reused on retry so the server dedupes a message that actually landed. */
export async function postThreadMessage(
  threadId: string,
  userId: string,
  operationId: string,
  body: string,
  replyToMessageIdOrFetch?: string | null | typeof fetch,
  attachments?: RentalMessageAttachment[],
  fetchImpl: typeof fetch = fetch
) {
  let replyToMessageId: string | null | undefined;
  let effectiveFetch: typeof fetch = fetchImpl;

  if (typeof replyToMessageIdOrFetch === "function") {
    effectiveFetch = replyToMessageIdOrFetch;
    replyToMessageId = undefined;
  } else {
    replyToMessageId = replyToMessageIdOrFetch;
  }

  const payload: Record<string, unknown> = { operationId, body };
  if (replyToMessageId) payload.replyToMessageId = replyToMessageId;
  if (attachments && attachments.length > 0) payload.attachments = attachments;

  const { message } = await apiJson<{ message: RentalMessageItem }>(
    `/api/messages/threads/${encodeURIComponent(threadId)}`,
    userId,
    { method: "POST", body: JSON.stringify(payload) },
    effectiveFetch
  );
  return message;
}

export async function uploadMessageAttachment(
  threadId: string,
  userId: string,
  file: File,
  fetchImpl: typeof fetch = fetch
): Promise<RentalMessageAttachment> {
  const form = new FormData();
  form.append("file", file);
  return apiJson<RentalMessageAttachment>(
    `/api/messages/threads/${encodeURIComponent(threadId)}/attachments`,
    userId,
    { method: "POST", body: form },
    fetchImpl
  );
}

export type InquiryIntent = { operationId: string; listingId: string; body: string };

export type AgreementConsentResponse = {
  agreement: {
    agreementId: string;
    unitId: string | null;
    status: "pending_both" | "renter_agreed" | "landlord_agreed" | "agreed" | "cancelled";
    renterAgreed?: boolean;
    landlordAgreed?: boolean;
    bothAgreed?: boolean;
  };
};

export async function setRentalAgreementConsent(
  threadId: string,
  userId: string,
  operationId: string,
  agree: boolean,
  unitId?: string | null,
  fetchImpl: typeof fetch = fetch
): Promise<AgreementConsentResponse> {
  return apiJson<AgreementConsentResponse>(
    `/api/messages/threads/${encodeURIComponent(threadId)}/agreement`,
    userId,
    {
      method: "POST",
      body: JSON.stringify({ operationId, agree, unitId: unitId ?? null }),
    },
    fetchImpl
  );
}

/** One POST per intent; the same operationId on retry lets the server dedupe an inquiry that actually landed. */
export async function postListingInquiry(userId: string, { listingId, operationId, body }: InquiryIntent, fetchImpl: typeof fetch = fetch) {
  const result = await apiJson<{ conversationId?: unknown }>("/api/messages/threads", userId, { method: "POST", body: JSON.stringify({ listingId, operationId, body }) }, fetchImpl);
  if (typeof result?.conversationId !== "string") throw new MessagingApiError("Something went wrong. Please try again.", "server");
  return { conversationId: result.conversationId };
}
