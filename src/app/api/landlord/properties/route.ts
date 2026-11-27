import { revalidatePath } from "next/cache";
import { invalidatePublicRentalsCache } from "@/server/rentals/public-rentals";
import { landlordSubmissionsLimiter } from "@/server/api-limiters";
import { createRoleGuard } from "@/server/role-access";

const headers = { "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });

const access = createRoleGuard({
  allowedRoles: ["landlord"],
  unauthenticatedMessage: "Sign in required.",
  forbiddenMessage: "Landlord account required.",
});

export async function POST(request: Request) {
  const session = await access(request);
  if ("response" in session && session.response) return session.response;
  const limit = landlordSubmissionsLimiter.checkDetailed(request, session.user.id);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many property submission attempts. Please wait a moment before trying again." },
      { status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  let body: unknown;
  try { body = await request.json(); } catch { return reply("Invalid submission request.", 400); }
  if (
    !body || typeof body !== "object" || Array.isArray(body) ||
    !("operationId" in body) || typeof body.operationId !== "string" || !uuid.test(body.operationId) ||
    !("draftId" in body) || typeof body.draftId !== "string" || !uuid.test(body.draftId) ||
    !("expectedRevision" in body) || typeof body.expectedRevision !== "number" || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 1
  ) {
    return reply("Invalid submission request.", 400);
  }

  const { data, error } = await session.supabase.rpc("submit_property_from_draft", {
    p_operation_id: body.operationId,
    p_draft_id: body.draftId,
    p_expected_revision: body.expectedRevision,
  });

  if (error?.code === "23505" || error?.code === "40001") {
    const isAlreadySubmitted = error?.message?.includes("this draft revision was already submitted");
    if (isAlreadySubmitted) {
      return Response.json(
        { error: "This draft revision was already submitted.", code: "already_submitted" },
        { status: 409, headers }
      );
    }
    return Response.json(
      { error: "This draft changed or was already submitted. Reload the draft before submitting.", code: "draft_conflict" },
      { status: 409, headers }
    );
  }
  if (error?.code === "22023") {
    return reply("The listing information is incomplete or invalid.", 400);
  }
  if (error?.code === "42501") {
    return reply("Landlord account required.", 403);
  }
  if (error || !data || typeof data !== "object" || !("property_id" in data) || typeof data.property_id !== "string") {
    return reply("Submission could not be completed. Please retry.", 503);
  }

  invalidatePublicRentalsCache();
  try {
    for (const path of ["/landlord/dashboard", "/landlord/properties", "/landlord/map"]) {
      revalidatePath(path);
    }
  } catch { /* ignore outside Next request context */ }
  return Response.json({ propertyId: data.property_id, status: "pending" }, { headers });
}
