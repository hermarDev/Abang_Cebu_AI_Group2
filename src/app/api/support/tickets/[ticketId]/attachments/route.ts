import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/support/validation";
import { reply, SUPPORT_ATTACHMENTS_BUCKET } from "@/server/support-api";

type Context = { params: Promise<{ ticketId: string }> };

export async function GET(request: Request, context: Context) {
  const { ticketId } = await context.params;
  if (!isValidUuid(ticketId)) {
    return reply({ error: "Invalid ticket ID." }, 400);
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path || path.trim().length === 0 || path.includes("..") || path.startsWith("/")) {
    return reply({ error: "Invalid attachment path." }, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return reply({ error: "Sign in to access attachments." }, 401);
  }

  const expectedUserId = request.headers.get("x-expected-user-id");
  if (expectedUserId && expectedUserId !== user.id) {
    return reply({ error: "Your account changed. Please refresh and try again." }, 409);
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id,user_id,attachments")
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketError) {
    return reply({ error: "Could not load ticket." }, 503);
  }

  if (!ticket) {
    return reply({ error: "Ticket not found." }, 404);
  }

  const isOwner = ticket.user_id === user.id;
  if (!isOwner) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,is_suspended")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return reply({ error: "Could not verify permissions." }, 503);
    }

    if (profile?.role !== "admin" || profile.is_suspended) {
      return reply({ error: "Access denied." }, 403);
    }
  }

  const rawAttachments = Array.isArray(ticket.attachments) ? ticket.attachments : [];
  const matched = rawAttachments.find((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const meta = item as Record<string, unknown>;
    return (meta.storagePath ?? meta.storage_path) === path;
  }) as Record<string, unknown> | undefined;

  if (!matched) {
    return reply({ error: "Attachment not found." }, 404);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return reply({ error: "Storage service is not configured." }, 503);
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch {
    return reply({ error: "Storage service is not configured." }, 503);
  }

  const { data: signed, error: signError } = await adminClient.storage
    .from(SUPPORT_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 60);

  if (signError || !signed?.signedUrl) {
    return reply({ error: "Failed to generate download URL." }, 503);
  }

  return reply(
    {
      url: signed.signedUrl,
      fileName: String(matched.fileName ?? matched.file_name ?? "attachment"),
      mimeType: String(matched.mimeType ?? matched.mime_type ?? "application/octet-stream"),
    },
    200,
  );
}
