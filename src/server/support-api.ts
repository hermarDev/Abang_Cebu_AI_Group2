import { createHash, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SupportAttachmentMeta,
  SupportCategory,
  SupportTicketPriority,
  SupportTicketRecord,
  SupportTicketStatus,
} from "@/lib/support/constants";

export const noStoreHeaders = { "Cache-Control": "no-store" } as const;

export const SUPPORT_ATTACHMENTS_BUCKET = "support-attachments";
export const MAX_SUPPORT_JSON_BYTES = 64 * 1024;
export const MAX_SUPPORT_MULTIPART_BYTES = 17 * 1024 * 1024;

export function reply(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: { ...noStoreHeaders, ...extraHeaders },
  });
}

export function hashGuestSupportToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyGuestSupportToken(token: string, expectedHash: string | null | undefined): boolean {
  if (!token || !expectedHash) return false;
  const actual = Buffer.from(hashGuestSupportToken(token), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false }> {
  const headerLen = request.headers.get("content-length");
  if (headerLen && /^\d+$/.test(headerLen.trim()) && Number(headerLen.trim()) > maxBytes) {
    return { ok: false };
  }

  if (!request.body) {
    return { ok: true, bytes: new Uint8Array(0) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false };
      }
      chunks.push(value);
    }
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes: out };
}

export function mapSupportTicketRow(row: Record<string, unknown>): SupportTicketRecord {
  const rawAttachments = row.attachments;
  const attachments: SupportAttachmentMeta[] = Array.isArray(rawAttachments)
    ? (rawAttachments as Record<string, unknown>[]).map((item) => ({
        storagePath: String(item?.storagePath ?? item?.storage_path ?? ""),
        fileName: String(item?.fileName ?? item?.file_name ?? "attachment"),
        fileSize: Number(item?.fileSize ?? item?.file_size ?? 0),
        mimeType: String(item?.mimeType ?? item?.mime_type ?? "application/octet-stream"),
      }))
    : [];

  return {
    id: String(row.id ?? ""),
    ticketNumber: String(row.ticket_number ?? row.ticketNumber ?? ""),
    userId: (row.user_id ?? row.userId ?? null) as string | null,
    requesterName: String(row.requester_name ?? row.requesterName ?? ""),
    requesterEmail: String(row.requester_email ?? row.requesterEmail ?? ""),
    requesterRole: String(row.requester_role ?? row.requesterRole ?? "guest"),
    category: (row.category ?? "other") as SupportCategory,
    subject: String(row.subject ?? ""),
    description: String(row.description ?? ""),
    relatedListingId: (row.related_listing_id ?? row.relatedListingId ?? null) as string | null,
    attachments,
    status: (row.status ?? "open") as SupportTicketStatus,
    priority: (row.priority ?? "normal") as SupportTicketPriority,
    adminResponse: (row.admin_response ?? row.adminResponse ?? null) as string | null,
    assignedAdminId: (row.assigned_admin_id ?? row.assignedAdminId ?? null) as string | null,
    assignedAdminName: (row.assigned_admin_name ?? row.assignedAdminName ?? null) as string | null,
    resolvedAt: (row.resolved_at ?? row.resolvedAt ?? null) as string | null,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ""),
  };
}

export async function cleanupSupportUploads(paths: readonly string[]): Promise<void> {
  if (!paths || paths.length === 0) return;
  try {
    const admin = createAdminClient();
    await admin.storage.from(SUPPORT_ATTACHMENTS_BUCKET).remove([...paths]);
  } catch {
    // Best-effort cleanup on failure; errors suppressed
  }
}
