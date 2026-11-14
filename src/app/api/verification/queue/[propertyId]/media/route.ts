import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isUuid,
  jsonError,
  jsonOk,
  rateLimited,
  requireActiveVerifier,
  verificationLimiter,
} from "@/server/verification-access";

function inspectVerificationMedia(
  kind: "photo" | "document" | "meeting_minutes",
  mime: string,
  bytes: Uint8Array
): string | null {
  if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) return null;
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  const png = starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpeg = starts([0xff, 0xd8, 0xff]);
  const webp =
    starts([0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  const pdf = starts([0x25, 0x50, 0x44, 0x46, 0x2d]);

  if (kind === "photo") {
    if (mime === "image/png" && png) return mime;
    if (mime === "image/jpeg" && jpeg) return mime;
    if (mime === "image/webp" && webp) return mime;
    return null;
  }

  // document or meeting_minutes can be PDF or image
  if (mime === "application/pdf" && pdf) return mime;
  if (mime === "image/png" && png) return mime;
  if (mime === "image/jpeg" && jpeg) return mime;
  if (mime === "image/webp" && webp) return mime;
  return null;
}

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await requireActiveVerifier(request);
  if ("response" in session && session.response) return session.response;

  const limited = rateLimited(verificationLimiter, request, session.user.id);
  if (limited) return limited;

  const { propertyId } = await params;
  if (!isUuid(propertyId)) return jsonError("Invalid property ID.", 400);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Invalid file form data.", 400);
  }

  const operationId = form.get("operationId");
  const kind = form.get("kind");
  const file = form.get("file");

  if (
    !isUuid(operationId) ||
    typeof kind !== "string" ||
    !["photo", "document", "meeting_minutes"].includes(kind) ||
    !(file instanceof File)
  ) {
    return jsonError("Invalid media upload request.", 400);
  }

  if (file.size === 0 || file.size > 10 * 1024 * 1024) {
    return jsonError("File size must be between 1 byte and 10 MB.", 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = inspectVerificationMedia(kind as "photo" | "document" | "meeting_minutes", file.type, bytes);
  if (!contentType) {
    return jsonError("Unsupported or invalid file format.", 400);
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const extension =
    contentType === "application/pdf"
      ? "pdf"
      : contentType === "image/png"
        ? "png"
        : contentType === "image/webp"
          ? "webp"
          : "jpg";

  const objectPath = `${session.user.id}/${propertyId}/${operationId}/${sha256}.${extension}`;

  try {
    const admin = createAdminClient();
    const bucket = admin.storage.from("field-verification-media");
    const { error: uploadError } = await bucket.upload(objectPath, file, {
      contentType,
      upsert: false,
    });

    if (uploadError && uploadError.message !== "The resource already exists") {
      return jsonError("Failed to store media file. Please retry.", 503);
    }

    const { data: signedData } = await bucket.createSignedUrl(objectPath, 900);

    return jsonOk({
      objectPath,
      sha256,
      kind,
      sizeBytes: bytes.length,
      contentType,
      signedUrl: signedData?.signedUrl || null,
    });
  } catch {
    return jsonError("Storage operation failed. Please retry.", 503);
  }
}
