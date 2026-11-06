import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });

async function access(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: reply("Sign in to submit a listing.", 401) } as const;
  if (request.headers.get("x-expected-user-id") !== user.id) return { response: reply("Your account changed. Please refresh and try again.", 409) } as const;
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError) return { response: reply("Your account could not be checked. Please try again.", 503) } as const;
  if (profile?.role !== "landlord" || profile.is_suspended) return { response: reply("Listing submission is available to active landlord accounts only.", 403) } as const;
  return { supabase, user } as const;
}

export async function POST(request: Request) {
  // The listing workflow is still preview-only: the submission path is not revision-safe or verified end to end.
  void request;
  return reply("Listing submission is unavailable in preview.", 503);
}

async function submitListing(request: Request) {
  const session = await access(request);
  if ("response" in session && session.response) return session.response;
  let body: unknown;
  try { body = await request.json(); } catch { return reply("Invalid submission.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply("Invalid submission.", 400);
  const input = body as Record<string, unknown>;
  if (typeof input.operationId !== "string" || !uuid.test(input.operationId) || typeof input.draftId !== "string" || !uuid.test(input.draftId) || !Number.isSafeInteger(input.expectedRevision) || (input.expectedRevision as number) < 1) return reply("Invalid submission.", 400);
  const { data, error } = await session.supabase.rpc("submit_property_from_draft", { p_operation_id: input.operationId, p_draft_id: input.draftId, p_expected_revision: input.expectedRevision });
  if (error?.code === "23505") {
    if (error.message?.includes("different submission")) return reply("This submission operation conflicts with an earlier attempt.", 409);
    const { data: existing } = await session.supabase.from("property_submissions").select("property_id,status,draft_id,expected_revision").eq("owner_id", session.user.id).eq("operation_id", input.operationId).maybeSingle();
    if (existing?.property_id && existing.draft_id === input.draftId && existing.expected_revision === input.expectedRevision) return Response.json({ propertyId: existing.property_id, status: existing.status }, { headers });
    return reply("This submission operation conflicts with an earlier attempt.", 409);
  }
  if (error?.code === "40001" || error?.code === "42501") return reply("This draft changed or is unavailable. Reload the saved draft before submitting.", 409);
  if (error?.code === "22023") return reply("The saved draft contains invalid or unsupported information.", 400);
  if (error) return reply("The listing could not be submitted. Please retry.", 503);
  if (!data || typeof data !== "object" || !("property_id" in data) || typeof data.property_id !== "string") return reply("Submission could not be confirmed. Please retry.", 503);
  return Response.json({ propertyId: data.property_id, status: "pending" }, { headers });
}
