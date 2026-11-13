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
