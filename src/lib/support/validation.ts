import { inspectDraftMedia } from "@/app/api/property-drafts/media-validation";
import {
  ALLOWED_SUPPORT_MIME_TYPES,
  MAX_SUPPORT_FILE_BYTES,
  MAX_SUPPORT_FILES,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  type SupportCategory,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "./constants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CATEGORY_SET = new Set<string>(SUPPORT_CATEGORIES.map((c) => c.value));
const STATUS_SET = new Set<string>(SUPPORT_STATUSES.map((s) => s.value));
const PRIORITY_SET = new Set<string>(SUPPORT_PRIORITIES.map((p) => p.value));
const MIME_SET = new Set<string>(ALLOWED_SUPPORT_MIME_TYPES);

export interface SupportSubmissionInput {
  operationId?: unknown;
  requesterName?: unknown;
  requesterEmail?: unknown;
  category?: unknown;
  subject?: unknown;
  description?: unknown;
  relatedListingId?: unknown;
  turnstileToken?: unknown;
  website?: unknown; // honeypot
}

export interface ValidSupportSubmission {
  operationId: string;
  requesterName: string;
  requesterEmail: string;
  category: SupportCategory;
  subject: string;
  description: string;
  relatedListingId: string | null;
  turnstileToken: string;
}

export type SupportFieldErrors = Partial<
  Record<"requesterName" | "requesterEmail" | "category" | "subject" | "description" | "relatedListingId" | "attachments", string>
>;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

export function isValidSupportCategory(value: unknown): value is SupportCategory {
  return typeof value === "string" && CATEGORY_SET.has(value);
}

export function isValidSupportStatus(value: unknown): value is SupportTicketStatus {
  return typeof value === "string" && STATUS_SET.has(value);
}

export function isValidSupportPriority(value: unknown): value is SupportTicketPriority {
  return typeof value === "string" && PRIORITY_SET.has(value);
}

export function sanitizeSupportFilename(name: string): string {
  const leaf = name.split(/[\\/]/).pop() ?? "attachment";
  const cleaned = leaf.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (cleaned || "attachment").slice(0, 120);
}

export function validateSupportSubmission(
  input: SupportSubmissionInput,
): { ok: true; value: ValidSupportSubmission } | { ok: false; errors: SupportFieldErrors; message: string } {
  const errors: SupportFieldErrors = {};

  const requesterName = typeof input.requesterName === "string" ? input.requesterName.trim().replace(/\s+/g, " ") : "";
  if (requesterName.length < 2 || requesterName.length > 100) {
    errors.requesterName = "Enter your name (2 to 100 characters).";
  }

  const requesterEmail = typeof input.requesterEmail === "string" ? input.requesterEmail.trim().toLowerCase() : "";
  if (!requesterEmail || requesterEmail.length > 254 || !EMAIL_PATTERN.test(requesterEmail)) {
    errors.requesterEmail = "Enter a valid email address.";
  }

  if (!isValidSupportCategory(input.category)) {
    errors.category = "Choose a support category.";
  }

  const subject = typeof input.subject === "string" ? input.subject.trim().replace(/\s+/g, " ") : "";
  if (subject.length < 5 || subject.length > 140) {
    errors.subject = "Enter a subject between 5 and 140 characters.";
  }

  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (description.length < 20 || description.length > 3000) {
    errors.description = "Describe your issue in 20 to 3,000 characters.";
  }

  let relatedListingId: string | null = null;
  if (typeof input.relatedListingId === "string" && input.relatedListingId.trim().length > 0) {
    const trimmedId = input.relatedListingId.trim();
    if (!UUID_PATTERN.test(trimmedId)) {
      errors.relatedListingId = "Enter a valid listing ID or leave this blank.";
    } else {
      relatedListingId = trimmedId;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
      message: "Review the highlighted fields and try again.",
    };
  }

  const operationId = isValidUuid(input.operationId) ? input.operationId.trim() : "";
  const turnstileToken = typeof input.turnstileToken === "string" ? input.turnstileToken.trim() : "";

  return {
    ok: true,
    value: {
      operationId,
      requesterName,
      requesterEmail,
      category: input.category as SupportCategory,
      subject,
      description,
      relatedListingId,
      turnstileToken,
    },
  };
}

export function validateSupportAttachmentFiles(files: readonly { name: string; type: string; size: number }[]): string | null {
  if (files.length > MAX_SUPPORT_FILES) {
    return `Attach up to ${MAX_SUPPORT_FILES} files per request.`;
  }
  for (const file of files) {
    if (!MIME_SET.has(file.type)) {
      return `"${sanitizeSupportFilename(file.name)}" must be a JPG, PNG, WebP, or PDF file.`;
    }
    if (file.size < 1 || file.size > MAX_SUPPORT_FILE_BYTES) {
      return `"${sanitizeSupportFilename(file.name)}" must be 5 MB or smaller.`;
    }
  }
  return null;
}

export function inspectSupportMediaBytes(mime: string, bytes: Uint8Array): string | null {
  if (bytes.length === 0 || bytes.length > MAX_SUPPORT_FILE_BYTES) return null;
  return inspectDraftMedia("permit", mime, bytes);
}
