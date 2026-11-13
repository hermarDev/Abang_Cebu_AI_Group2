import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/support/validation";
import { reply, SUPPORT_ATTACHMENTS_BUCKET, verifyGuestSupportToken } from "@/server/support-api";

type Context = { params: Promise<{ ticketId: string }> };

export async function GET(request: Request, context: Context) {
  const { ticketId } = await context.params;
  if (!isValidUuid(ticketId)) {
    return reply({ error: "Invalid ticket ID." }, 400);
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const guestToken = url.searchParams.get("token")?.trim() ?? "";

  if (!path || path.trim().length === 0 || path.includes("..") || path.startsWith("/")) {
    return reply({ error: "Invalid attachment path." }, 400);
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

  let ticket: {
    id: string;
    user_id: string | null;
    attachments: unknown;
    guest_access_token_hash?: string | null;
  } | null = null;

  if (guestToken) {
    const { data, error: guestTicketError } = await adminClient
      .from("support_tickets")
      .select("id,user_id,attachments,guest_access_token_hash")
      .eq("id", ticketId)
      .maybeSingle();

    if (guestTicketError) {
      return reply({ error: "Could not load ticket." }, 503);
    }
    if (!data) {
      return reply({ error: "Ticket not found." }, 404);
    }
    if (!verifyGuestSupportToken(guestToken, data.guest_access_token_hash)) {
      return reply({ error: "Access denied." }, 403);
    }
    ticket = data;
  } else {
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

    const { data, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id,user_id,attachments")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError) {
      return reply({ error: "Could not load ticket." }, 503);
    }

    if (!data) {
      return reply({ error: "Ticket not found." }, 404);
    }

    const isOwner = data.user_id === user.id;
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

    ticket = data;
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
