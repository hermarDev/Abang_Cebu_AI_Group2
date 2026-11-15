import { createAdminClient } from "@/lib/supabase/admin";
import {
  isUuid,
  isValidNotes,
  isValidVerificationStatus,
  jsonError,
  jsonOk,
  rateLimited,
  readJsonObject,
  requireActiveVerifier,
  verificationLimiter,
  verifierRpc,
} from "@/server/verification-access";

const PROOF_OBJECT_PATH_RE = /^[^/]+\/[^/]+\/[^/]+\/[0-9a-f]{64}\.(jpg|png|webp|pdf)$/i;

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const session = await requireActiveVerifier(request);
  if ("response" in session && session.response) return session.response;

  const { propertyId } = await params;
  if (!isUuid(propertyId)) return jsonError("Invalid property ID.", 400);

  const { data: property, error } = await verifierRpc(session.supabase, "verifier_get_queue_property", {
    p_property_id: propertyId,
  });
  if (error) return jsonError("Queue could not be loaded. Please retry.", 503);
  if (!property || typeof property !== "object" || Array.isArray(property)) return jsonError("Property not found in verification queue.", 404);
  const item = property as Record<string, unknown>;

  const proofPaths: string[] = [];
  if (Array.isArray(item.fieldVerificationProof)) {
    for (const proof of item.fieldVerificationProof) {
      if (proof && typeof proof === "object" && typeof (proof as { object_path?: unknown }).object_path === "string") {
        proofPaths.push((proof as { object_path: string }).object_path);
      }
    }
  }

  const signed = new Map<string, string>();
  if (proofPaths.length > 0) {
    try {
      const { data: urls } = await createAdminClient()
        .storage.from("field-verification-media")
        .createSignedUrls(proofPaths, 900);
      for (const entry of urls ?? []) {
        if (entry?.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
      }
    } catch {
      // Degrade gracefully
    }
  }

  let proofWithUrls: unknown = item.fieldVerificationProof;
  if (Array.isArray(item.fieldVerificationProof)) {
    proofWithUrls = item.fieldVerificationProof.map((proof: unknown) => {
      if (proof && typeof proof === "object" && typeof (proof as { object_path?: unknown }).object_path === "string") {
        const path = (proof as { object_path: string }).object_path;
        return { ...proof, signedUrl: signed.get(path) || null };
      }
      return proof;
    });
  }

  return jsonOk({ property: { ...item, fieldVerificationProof: proofWithUrls } });
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await requireActiveVerifier(request);
  if ("response" in session && session.response) return session.response;

  const limited = rateLimited(verificationLimiter, request, session.user.id);
  if (limited) return limited;

  const { propertyId } = await params;
  if (!isUuid(propertyId)) return jsonError("Invalid property ID.", 400);

  const body = await readJsonObject(request);
  if (!body) return jsonError("Invalid request payload.", 400);
  if (body.contractVersion !== 2) {
    return Response.json({ code: "verification_contract_upgrade", error: "Verification workflow updated. Refresh the page and try again." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }

  const {
    operationId,
    submissionDraftId,
    submissionExpectedRevision,
    status,
    method,
    notes,
    proof,
    visitWith,
    representativeName,
    representativeRelationship,
  } = body;

  if (
    !isUuid(operationId) ||
    !isUuid(submissionDraftId) ||
    typeof submissionExpectedRevision !== "number" ||
    !Number.isSafeInteger(submissionExpectedRevision) ||
    submissionExpectedRevision < 1 ||
    !isValidVerificationStatus(status) ||
    method !== "site_visit" ||
    !isValidNotes(notes) ||
    !["owner", "representative"].includes(String(visitWith))
  ) {
    return jsonError("Invalid site-visit parameters.", 400);
  }
  if (visitWith === "representative" && (
    typeof representativeName !== "string" || representativeName.trim().length < 1 || representativeName.trim().length > 200 ||
    typeof representativeRelationship !== "string" || representativeRelationship.trim().length < 1 || representativeRelationship.trim().length > 200
  )) {
    return jsonError("Representative name and relationship are required.", 400);
  }

  const proofList = Array.isArray(proof) ? proof : [];
  if (status === "verified" && proofList.length === 0) {
    return jsonError("Verified status requires at least one proof item.", 400);
  }

  for (const item of proofList) {
    if (
      !item ||
      typeof item !== "object" ||
      !["proof"].includes(String(item.kind)) ||
      typeof item.object_path !== "string" ||
      !PROOF_OBJECT_PATH_RE.test(item.object_path) ||
      item.object_path.split("/")[0] !== propertyId
    ) {
      return jsonError("Invalid proof item format.", 400);
    }
  }

  const { data, error } = await verifierRpc(session.supabase, "verifier_submit_verification", {
    p_property_id: propertyId,
    p_operation_id: operationId,
    p_submission_draft_id: submissionDraftId,
    p_submission_expected_revision: submissionExpectedRevision,
    p_status: status,
    p_method: "site_visit",
    p_notes: (notes as string).trim(),
    p_proof: proofList,
    p_proxy_name: visitWith === "representative" ? (representativeName as string).trim() : null,
    p_proxy_relationship: visitWith === "representative" ? (representativeRelationship as string).trim() : null,
  });

  if (error?.code === "42501") return jsonError("Active verifier or admin permissions required.", 403);
  if (error?.code === "23505" || error?.code === "40001") {
    return jsonError("Submission revision changed or operation conflict. Reload and retry.", 409);
  }
  if (error?.code === "22023") return jsonError("Invalid verification data submitted.", 400);
  if (error) return jsonError("Verification submission could not be processed. Please retry.", 503);

  return jsonOk({ verification: data });
}
