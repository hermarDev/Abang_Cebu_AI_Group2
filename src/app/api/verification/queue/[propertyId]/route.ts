import { createAdminClient } from "@/lib/supabase/admin";
import {
  isUuid,
  isValidNotes,
  isValidVerificationMethod,
  isValidVerificationStatus,
  jsonError,
  jsonOk,
  rateLimited,
  readJsonObject,
  requireActiveVerifier,
  verificationLimiter,
  verifierRpc,
} from "@/server/verification-access";

const PROOF_OBJECT_PATH_RE = /^[0-9a-f-]+(\/[0-9a-f-]+){2}\/[0-9a-f]{64}\.(jpg|png|webp|pdf)$/i;

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const session = await requireActiveVerifier(request);
  if ("response" in session && session.response) return session.response;

  const { propertyId } = await params;
  if (!isUuid(propertyId)) return jsonError("Invalid property ID.", 400);

  const { data, error } = await verifierRpc(session.supabase, "verifier_list_queue", {
    p_status: null,
    p_search: null,
    p_limit: 100,
    p_offset: 0,
  });

  if (error || !Array.isArray(data)) return jsonError("Queue could not be loaded. Please retry.", 503);

  const property = (data as Array<Record<string, unknown>>).find((item) => item.id === propertyId);
  if (!property) return jsonError("Property not found in verification queue.", 404);

  const proofPaths: string[] = [];
  if (Array.isArray(property.fieldVerificationProof)) {
    for (const proof of property.fieldVerificationProof) {
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

  let proofWithUrls = property.fieldVerificationProof;
  if (Array.isArray(property.fieldVerificationProof)) {
    proofWithUrls = property.fieldVerificationProof.map((proof) => {
      if (proof && typeof proof === "object" && typeof (proof as { object_path?: unknown }).object_path === "string") {
        const path = (proof as { object_path: string }).object_path;
        return { ...proof, signedUrl: signed.get(path) || null };
      }
      return proof;
    });
  }

  return jsonOk({ property: { ...property, fieldVerificationProof: proofWithUrls } });
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

  const {
    operationId,
    submissionDraftId,
    submissionExpectedRevision,
    status,
    method,
    notes,
    proof,
    proxyName,
    proxyRelationship,
  } = body;

  if (
    !isUuid(operationId) ||
    !isUuid(submissionDraftId) ||
    typeof submissionExpectedRevision !== "number" ||
    !Number.isSafeInteger(submissionExpectedRevision) ||
    submissionExpectedRevision < 1 ||
    !isValidVerificationStatus(status) ||
    !isValidVerificationMethod(method) ||
    !isValidNotes(notes)
  ) {
    return jsonError("Invalid verification parameters.", 400);
  }

  if (method === "proxy_meeting") {
    if (typeof proxyName !== "string" || !proxyName.trim() || typeof proxyRelationship !== "string" || !proxyRelationship.trim()) {
      return jsonError("Proxy meeting requires proxy name and relationship.", 400);
    }
  }

  const proofList = Array.isArray(proof) ? proof : [];
  if (status === "verified" && proofList.length === 0) {
    return jsonError("Verified status requires at least one proof item.", 400);
  }

  for (const item of proofList) {
    if (
      !item ||
      typeof item !== "object" ||
      !["photo", "document", "meeting_minutes"].includes(String(item.kind)) ||
      typeof item.object_path !== "string" ||
      !PROOF_OBJECT_PATH_RE.test(item.object_path)
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
    p_method: method,
    p_notes: (notes as string).trim(),
    p_proof: proofList,
    p_proxy_name: method === "proxy_meeting" && typeof proxyName === "string" ? proxyName.trim() : null,
    p_proxy_relationship: method === "proxy_meeting" && typeof proxyRelationship === "string" ? proxyRelationship.trim() : null,
  });

  if (error?.code === "42501") return jsonError("Active verifier or admin permissions required.", 403);
  if (error?.code === "23505" || error?.code === "40001") {
    return jsonError("Submission revision changed or operation conflict. Reload and retry.", 409);
  }
  if (error?.code === "22023") return jsonError("Invalid verification data submitted.", 400);
  if (error) return jsonError("Verification submission could not be processed. Please retry.", 503);

  return jsonOk({ verification: data });
}
