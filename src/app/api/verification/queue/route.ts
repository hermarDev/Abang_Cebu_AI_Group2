import { createAdminClient } from "@/lib/supabase/admin";
import {
  jsonError,
  jsonOk,
  pageParams,
  requireActiveVerifier,
  verifierRpc,
} from "@/server/verification-access";

const allowedStatuses = ["pending_verification", "verified", "flagged", "all"];

export async function GET(request: Request) {
  const session = await requireActiveVerifier(request);
  if ("response" in session && session.response) return session.response;

  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const page = pageParams(params);
  if (!page || (status !== null && !allowedStatuses.includes(status))) {
    return jsonError("Invalid queue filter.", 400);
  }

  const { data, error } = await verifierRpc(session.supabase, "verifier_list_queue", {
    p_status: status && status !== "all" ? status : null,
    p_search: params.get("search")?.trim() || null,
    p_limit: page.limit,
    p_offset: page.offset,
  });

  if (error || !Array.isArray(data)) {
    return jsonError("Queue could not be loaded. Please retry.", 503);
  }

  const items = data as Array<Record<string, unknown>>;
  const proofPaths: string[] = [];
  for (const item of items) {
    if (Array.isArray(item.fieldVerificationProof)) {
      for (const proof of item.fieldVerificationProof) {
        if (proof && typeof proof === "object" && typeof (proof as { object_path?: unknown }).object_path === "string") {
          proofPaths.push((proof as { object_path: string }).object_path);
        }
      }
    }
  }

  const uniquePaths = [...new Set(proofPaths)];
  const signed = new Map<string, string>();
  if (uniquePaths.length > 0) {
    try {
      const { data: urls } = await createAdminClient()
        .storage.from("field-verification-media")
        .createSignedUrls(uniquePaths, 900);
      for (const entry of urls ?? []) {
        if (entry?.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
      }
    } catch {
      // Degrade gracefully without signed URLs
    }
  }

  const enhanced = items.map((item) => {
    let proofWithUrls = item.fieldVerificationProof;
    if (Array.isArray(item.fieldVerificationProof)) {
      proofWithUrls = item.fieldVerificationProof.map((proof) => {
        if (proof && typeof proof === "object" && typeof (proof as { object_path?: unknown }).object_path === "string") {
          const path = (proof as { object_path: string }).object_path;
          return { ...proof, signedUrl: signed.get(path) || null };
        }
        return proof;
      });
    }
    return { ...item, fieldVerificationProof: proofWithUrls };
  });

  return jsonOk({ queue: enhanced });
}
