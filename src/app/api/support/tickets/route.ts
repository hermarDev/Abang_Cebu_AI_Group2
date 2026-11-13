import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  isValidUuid,
  inspectSupportMediaBytes,
  sanitizeSupportFilename,
  validateSupportAttachmentFiles,
  validateSupportSubmission,
} from "@/lib/support/validation";
import { supportTicketsLimiter } from "@/server/api-limiters";
import { getClientIp } from "@/server/rate-limit";
import {
  cleanupSupportUploads,
  mapSupportTicketRow,
  reply,
  SUPPORT_ATTACHMENTS_BUCKET,
} from "@/server/support-api";
import { verifyTurnstileToken } from "@/server/turnstile";
import type { SupportAttachmentMeta } from "@/lib/support/constants";

function getFileExtension(mimeType: string, filename: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default: {
      const match = filename.match(/\.([0-9a-z]+)$/i);
      return match ? match[1].toLowerCase() : "bin";
    }
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return reply({ error: "Sign in to view your support tickets." }, 401);
  }

  const expectedUserId = request.headers.get("x-expected-user-id");
  if (expectedUserId && expectedUserId !== user.id) {
    return reply({ error: "Your account changed. Please refresh and try again." }, 409);
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit =
    limitParam && /^\d+$/.test(limitParam)
      ? Math.min(Math.max(1, Number(limitParam)), 50)
      : 50;

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return reply({ error: "Could not load support tickets." }, 503);
  }

  const tickets = (data ?? []).map(mapSupportTicketRow);
  return reply({ tickets }, 200);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let rawFields: Record<string, unknown> = {};
  const files: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      for (const [key, val] of formData.entries()) {
        if (key === "attachments") {
          if (val instanceof File && val.size > 0) {
            files.push(val);
          }
        } else if (typeof val === "string") {
          rawFields[key] = val;
        }
      }
    } catch {
      return reply({ error: "Invalid form data submission." }, 400);
    }
  } else {
    try {
      const body: unknown = await request.json();
      if (body && typeof body === "object" && !Array.isArray(body)) {
        rawFields = body as Record<string, unknown>;
      } else {
        return reply({ error: "Invalid JSON request body." }, 400);
      }
    } catch {
      return reply({ error: "Invalid JSON request body." }, 400);
    }
  }

  // 1. Honeypot check
  const website = rawFields.website;
  if (website !== undefined && website !== null && String(website).trim() !== "") {
    return reply({ error: "Invalid submission." }, 400);
  }

  // 2. Rate limiter with fail-closed production IP check
  const ip = getClientIp(request);
  if (!ip) {
    return reply(
      { error: "Too many support requests. Please wait before trying again." },
      429,
      { "Retry-After": "60" },
    );
  }

  const actorKey =
    typeof rawFields.requesterEmail === "string" && rawFields.requesterEmail.trim()
      ? rawFields.requesterEmail.trim().toLowerCase()
      : ip;

  const { allowed, retryAfterSeconds } = supportTicketsLimiter.checkDetailed(request, actorKey);
  if (!allowed) {
    return reply(
      { error: "Too many support requests. Please wait before trying again.", retryAfterSeconds },
      429,
      { "Retry-After": String(retryAfterSeconds) },
    );
  }

  // 3. Turnstile verification
  const turnstileToken =
    typeof rawFields.turnstileToken === "string" ? rawFields.turnstileToken.trim() : "";
  const turnstileResult = await verifyTurnstileToken(turnstileToken, request);
  if (!turnstileResult.valid) {
    return reply({ error: "Security check failed. Please refresh and try again." }, 403);
  }

  // 4. Session & x-expected-user-id check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const expectedUserId = request.headers.get("x-expected-user-id");
    if (expectedUserId && expectedUserId !== user.id) {
      return reply({ error: "Your account changed. Please refresh and try again." }, 409);
    }
  }

  // 5. Payload validation
  const operationId =
    typeof rawFields.operationId === "string" && rawFields.operationId.trim()
      ? rawFields.operationId.trim()
      : crypto.randomUUID();

  if (!isValidUuid(operationId)) {
    return reply(
      {
        error: "Invalid request id.",
        errors: { operationId: "Operation ID must be a valid UUID." },
      },
      422,
    );
  }

  const validation = validateSupportSubmission({
    operationId,
    requesterName: rawFields.requesterName,
    requesterEmail: rawFields.requesterEmail,
    category: rawFields.category,
    subject: rawFields.subject,
    description: rawFields.description,
    relatedListingId: rawFields.relatedListingId,
    turnstileToken,
  });

  if (!validation.ok) {
    return reply({ error: validation.message, errors: validation.errors }, 422);
  }

  // 6. Validate attached files
  const fileBuffers: Uint8Array[] = [];
  if (files.length > 0) {
    const fileMeta = files.map((f) => ({ name: f.name, type: f.type, size: f.size }));
    const filesError = validateSupportAttachmentFiles(fileMeta);
    if (filesError) {
      return reply({ error: filesError, errors: { attachments: filesError } }, 400);
    }

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const inspectedMime = inspectSupportMediaBytes(file.type, bytes);
      if (!inspectedMime) {
        return reply(
          {
            error: `File "${sanitizeSupportFilename(file.name)}" does not match its declared format.`,
            errors: { attachments: "Invalid file format." },
          },
          400,
        );
      }
      fileBuffers.push(bytes);
    }
  }

  // 7. Upload files if present
  const ticketId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  const attachmentsMeta: SupportAttachmentMeta[] = [];

  if (files.length > 0) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return reply(
        { error: "Attachment storage is temporarily unavailable. Please try again later." },
        503,
      );
    }

    let adminClient: ReturnType<typeof createAdminClient>;
    try {
      adminClient = createAdminClient();
    } catch {
      return reply(
        { error: "Attachment storage is temporarily unavailable. Please try again later." },
        503,
      );
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const bytes = fileBuffers[i];
      const ext = getFileExtension(file.type, file.name);
      const storagePath = `${ticketId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await adminClient.storage
        .from(SUPPORT_ATTACHMENTS_BUCKET)
        .upload(storagePath, bytes, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        await cleanupSupportUploads(uploadedPaths);
        return reply({ error: "Failed to upload attachments. Please retry." }, 503);
      }

      uploadedPaths.push(storagePath);
      attachmentsMeta.push({
        storagePath,
        fileName: sanitizeSupportFilename(file.name),
        fileSize: file.size,
        mimeType: file.type,
      });
    }
  }

  // 8. Call RPC submit_support_ticket
  const { data, error: rpcError } = await supabase.rpc("submit_support_ticket", {
    p_operation_id: validation.value.operationId,
    p_requester_name: validation.value.requesterName,
    p_requester_email: validation.value.requesterEmail,
    p_category: validation.value.category,
    p_subject: validation.value.subject,
    p_description: validation.value.description,
    p_related_listing_id: validation.value.relatedListingId,
    p_attachments: attachmentsMeta,
    p_ticket_id: ticketId,
  });

  if (rpcError) {
    await cleanupSupportUploads(uploadedPaths);
    if (rpcError.code === "23505") {
      return reply({ error: "Operation ID already used for a different request." }, 409);
    }
    if (rpcError.code === "22023") {
      return reply({ error: "Invalid support ticket payload." }, 400);
    }
    return reply({ error: "Could not submit support ticket. Please try again." }, 503);
  }

  const result = (data ?? {}) as Record<string, unknown>;
  const isReplay = result.replayed === true;
  return reply({ ticket: data }, isReplay ? 200 : 201);
}
