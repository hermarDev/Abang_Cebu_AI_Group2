import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });

async function access(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: reply("Sign in to review listings.", 401) } as const;
  if (request.headers.get("x-expected-user-id") !== user.id) return { response: reply("Your account changed. Please refresh and try again.", 409) } as const;
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError) return { response: reply("Your account could not be checked. Please try again.", 503) } as const;
  if (profile?.role !== "admin" || profile.is_suspended) return { response: reply("Listing review is available to active admins only.", 403) } as const;
  return { supabase, user } as const;
}

export async function POST(request: Request) {
  const session = await access(request);
  if ("response" in session && session.response) return session.response;
  let body: unknown;
  try { body = await request.json(); } catch { return reply("Invalid review.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply("Invalid review.", 400);
  const input = body as Record<string, unknown>;
  if (typeof input.propertyId !== "string" || !uuid.test(input.propertyId) || typeof input.operationId !== "string" || !uuid.test(input.operationId) || (input.decision !== "approved" && input.decision !== "rejected")) return reply("Invalid review.", 400);
  const note = input.decision === "rejected" && typeof input.note === "string" ? input.note : null;
  if (input.decision === "rejected" && (!note || !note.trim() || note.length > 1000)) return reply("A rejection reason is required.", 400);
  const draftId = typeof input.submissionDraftId === "string" && uuid.test(input.submissionDraftId) ? input.submissionDraftId : null;
  const expectedRevision = Number.isSafeInteger(input.submissionExpectedRevision) && (input.submissionExpectedRevision as number) >= 1 ? input.submissionExpectedRevision as number : null;
  if (draftId === null || expectedRevision === null) return reply("Provide the exact submission revision.", 400);
  const docDecision = typeof input.documentApplicabilityDecision === "string" && ["documents_verified", "exemption_accepted", "documents_required"].includes(input.documentApplicabilityDecision) ? input.documentApplicabilityDecision : null;
  let result;
  try {
    result = await session.supabase.rpc("review_property", {
      p_property_id: input.propertyId,
      p_operation_id: input.operationId,
      p_decision: input.decision,
      p_note: note,
      p_submission_draft_id: draftId,
      p_submission_expected_revision: expectedRevision,
      ...(docDecision ? { p_document_decision: docDecision } : {}),
    });
  } catch {
    return reply("The review outcome could not be confirmed. Reload its status before retrying.", 503);
  }
  const { data, error } = result;
  if (error?.code === "23505") return reply("This review operation conflicts with an earlier attempt.", 409);
  if (error?.code === "40001") {
    if (error?.message && error.message.includes("field verification required")) {
      return reply("Field verification is required before admin approval can be granted.", 409);
    }
    return reply("This property changed after it was submitted. Reload and review the current submission.", 409);
  }
  if (error?.code === "42501" || error?.code === "22023") return reply("This property is not pending review.", 409);
  if (error) return reply("The review could not be saved. Please retry.", 503);
  if (!data || typeof data !== "object" || !("status" in data)) return reply("Review could not be confirmed. Please retry.", 503);
  return Response.json({ status: data.status }, { headers });
}
