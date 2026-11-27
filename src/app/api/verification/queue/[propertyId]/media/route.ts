import { createHash } from "node:crypto";
import { inspectDraftMedia } from "@/app/api/property-drafts/media-validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_UPLOAD_MULTIPART_BYTES, readBoundedFormData } from "@/server/bounded-body";
import {
  isUuid,
  jsonError,
  jsonOk,
  rateLimited,
  requireActiveVerifier,
  verificationLimiter,
} from "@/server/verification-access";

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await requireActiveVerifier(request);
  if ("response" in session && session.response) return session.response;

  const limited = rateLimited(verificationLimiter, request, session.user.id);
  if (limited) return limited;

  const { propertyId } = await params;
  if (!isUuid(propertyId)) return jsonError("Invalid property ID.", 400);

  const parsedForm = await readBoundedFormData(request, MAX_UPLOAD_MULTIPART_BYTES);
  if (!parsedForm.ok) {
    return jsonError(
      parsedForm.reason === "too_large"
        ? "File size must be between 1 byte and 10 MB."
        : "Invalid file form data.",
      parsedForm.reason === "too_large" ? 413 : 400,
    );
  }
  const form = parsedForm.form;

  const operationId = form.get("operationId");
  const kind = form.get("kind");
  const file = form.get("file");

  if (
    !isUuid(operationId) ||
    typeof kind !== "string" ||
    !["proof"].includes(kind) ||
    !(file instanceof File)
  ) {
    return jsonError("Invalid media upload request.", 400);
  }

  if (file.size === 0 || file.size > 10 * 1024 * 1024) {
    return jsonError("File size must be between 1 byte and 10 MB.", 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = inspectDraftMedia("permit", file.type, bytes);
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
