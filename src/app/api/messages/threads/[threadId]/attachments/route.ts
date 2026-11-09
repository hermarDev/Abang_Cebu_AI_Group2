import { createAdminClient } from "@/lib/supabase/admin";
import { inspectDraftMedia } from "@/app/api/property-drafts/media-validation";
import { createRateLimiter } from "@/server/rate-limit";
import { limited, reply, requireMessagingUser, uuidPattern } from "@/server/messaging-api";

const uploadLimiter = createRateLimiter({ windowMs: 60_000, maxPerIp: 20, maxPerActor: 20 });
type Context = { params: Promise<{ threadId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const session = await requireMessagingUser(request);
    if (session.response) return session.response;
    const limit = limited(uploadLimiter, request, session.user.id);
    if (limit) return limit;

    const { threadId } = await context.params;
    if (!uuidPattern.test(threadId)) return reply({ error: "Choose a valid conversation." }, 400);

    const { data: conv, error: convError } = await session.supabase
      .from("rental_conversations")
      .select("id,status,renter_id,landlord_id")
      .eq("id", threadId)
      .maybeSingle();

    if (convError || !conv || (conv.renter_id !== session.user.id && conv.landlord_id !== session.user.id)) {
      return reply({ error: "You cannot upload attachments to this conversation." }, 403);
    }
    if (conv.status !== "active") {
      return reply({ error: "Conversation is closed." }, 403);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return reply({ error: "Invalid form data." }, 400);
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return reply({ error: "Choose a valid image file." }, 400);
    }

    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      return reply({ error: "Images must be 10MB or less." }, 400);
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const validMime = inspectDraftMedia("photo", file.type, buffer);
    if (!validMime) {
      return reply({ error: "Only JPEG, PNG, and WebP images are supported." }, 400);
    }

    const ext = validMime === "image/png" ? "png" : validMime === "image/webp" ? "webp" : "jpg";
    const storagePath = `${threadId}/${session.user.id}/${globalThis.crypto.randomUUID()}.${ext}`;

    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from("rental-message-attachments")
      .upload(storagePath, buffer, { contentType: validMime, upsert: false });

    if (uploadError) {
      return reply({ error: "Image upload failed. Please try again." }, 503);
    }

    const { data: signed } = await admin.storage
      .from("rental-message-attachments")
      .createSignedUrl(storagePath, 3600);

    return reply({
      storagePath,
      fileName: file.name.slice(0, 255),
      fileSize: file.size,
      mimeType: validMime,
      url: signed?.signedUrl ?? null,
    }, 201);
  } catch {
    return reply({ error: "Attachment upload failed." }, 500);
  }
}
