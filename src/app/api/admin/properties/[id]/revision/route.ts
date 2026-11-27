import { createAdminClient } from "@/lib/supabase/admin";
import { adminLifecycleLimiter, jsonError, jsonOk, rateLimited, requireActiveAdmin, validUuid } from "@/server/admin-access";

const storagePath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f]{64}\.(?:jpg|png|webp|pdf)$/i;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const limited = rateLimited(adminLifecycleLimiter, request, session.user.id);
  if (limited) return limited;
  const { id } = await params;
  const search = new URL(request.url).searchParams;
  const draftId = search.get("draftId");
  const rawRevision = search.get("revision") ?? "";
  const revision = Number(rawRevision);
  if (!validUuid(id) || !validUuid(draftId) || !/^\d+$/.test(rawRevision) || !Number.isSafeInteger(revision) || revision < 1) return jsonError("Invalid submission revision.", 400);

  try {
    // Submission RLS permits owner reads only; privileged access follows the active-admin guard.
    const admin = createAdminClient();
    const { data: submission, error } = await admin.from("property_submissions")
      .select("operation_id, draft_id, expected_revision, snapshot_payload, snapshot_media, review_status, created_at, field_verification_status, field_verified_by, field_verified_at, field_verification_method, field_verification_notes, field_verification_proof, field_verification_proxy_name, field_verification_proxy_relationship")
      .eq("property_id", id).eq("draft_id", draftId).eq("expected_revision", revision)
      .eq("review_status", "pending").is("superseded_by", null).maybeSingle();
    if (error) return jsonError("Failed to load revision.", 503);
    if (!submission) return jsonError("Revision is no longer pending. Reload the queue.", 409);
    const payload: unknown = submission.snapshot_payload;
    const media: unknown = submission.snapshot_media;
    if (!object(payload) || !object(payload.property) || !object(payload.unit) || !Array.isArray(media)) return jsonError("Submission snapshot is unavailable.", 409);
    if (media.some((item) => !object(item) || !["photo", "permit"].includes(String(item.kind)) || typeof item.object_path !== "string" || !storagePath.test(item.object_path) || (item.kind === "photo" && !/\.(jpg|png|webp)$/i.test(item.object_path)))) return jsonError("Submission media is unavailable.", 503);
    const paths = [...new Set(media.map((item) => item.object_path as string))];
    let fieldVerificationProof: unknown = submission.field_verification_proof;
    const proofPaths = Array.isArray(fieldVerificationProof)
      ? [...new Set(fieldVerificationProof.flatMap((proof) => object(proof) && typeof proof.object_path === "string" ? [proof.object_path as string] : []))]
      : [];

    const [mediaSignRes, proofSignRes] = await Promise.all([
      paths.length
        ? admin.storage.from("property-draft-media").createSignedUrls(paths, 900)
        : Promise.resolve({ data: [], error: null }),
      proofPaths.length
        ? admin.storage.from("field-verification-media").createSignedUrls(proofPaths, 900).catch(() => ({ data: null }))
        : Promise.resolve({ data: [] }),
    ]);

    const signed = new Map<string, string>();
    if (paths.length) {
      if (mediaSignRes.error) return jsonError("Submission media could not be loaded.", 503);
      for (const entry of mediaSignRes.data ?? []) if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
      if (paths.some((path) => !signed.has(path))) return jsonError("Submission media could not be loaded.", 503);
    }

    if (Array.isArray(fieldVerificationProof)) {
      const proofSigned = new Map<string, string>();
      for (const entry of proofSignRes.data ?? []) if (entry?.path && entry.signedUrl) proofSigned.set(entry.path, entry.signedUrl);
      fieldVerificationProof = fieldVerificationProof.map((proof) => object(proof) && typeof proof.object_path === "string"
        ? { ...proof, signedUrl: proofSigned.get(proof.object_path) ?? null } : proof);
    }

    return jsonOk({ revision: {
      id: submission.operation_id, draftId: submission.draft_id, expectedRevision: submission.expected_revision,
      snapshotPayload: payload, snapshotMedia: media.map((item) => ({ kind: item.kind, url: signed.get(item.object_path) })),
      reviewStatus: submission.review_status, createdAt: submission.created_at,
      fieldVerificationStatus: submission.field_verification_status,
      fieldVerifiedBy: submission.field_verified_by,
      fieldVerifiedAt: submission.field_verified_at,
      fieldVerificationMethod: submission.field_verification_method,
      fieldVerificationNotes: submission.field_verification_notes,
      fieldVerificationProof,
      fieldVerificationProxyName: submission.field_verification_proxy_name,
      fieldVerificationProxyRelationship: submission.field_verification_proxy_relationship,
    } });
  } catch {
    return jsonError("Revision could not be loaded. Please retry.", 503);
  }
}
