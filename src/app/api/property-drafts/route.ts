import { revalidatePath } from "next/cache";
import { invalidateLandlordPortfolioCache } from "@/server/landlord-portfolio-cache";
import { propertyDraftsLimiter } from "@/server/api-limiters";
import { createRoleGuard } from "@/server/role-access";
import type { Json } from "@/types/database";

const LANDLORD_REVALIDATE_PATHS = ["/landlord/dashboard", "/landlord/properties", "/landlord/map"] as const;
function revalidateLandlordPaths() {
  invalidateLandlordPortfolioCache();
  try {
    for (const path of LANDLORD_REVALIDATE_PATHS) revalidatePath(path);
  } catch { /* ignore outside Next request context */ }
}

const headers = { "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });

const access = createRoleGuard({
  allowedRoles: ["landlord"],
  unauthenticatedMessage: "Sign in to access property drafts.",
  forbiddenMessage: "Property drafts are available to active landlord accounts only.",
});

function validPayload(value: unknown): value is Json {
  return !!value && typeof value === "object" && !Array.isArray(value) && new TextEncoder().encode(JSON.stringify(value)).byteLength <= 32768;
}

async function readBody(request: Request) {
  try {
    const value: unknown = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

export async function GET(request: Request) {
  const session = await access(request);
  if ("response" in session && session.response) return session.response;
  const { data, error } = await session.supabase.from("property_drafts").select("id,payload,revision,created_at").eq("owner_id", session.user.id).order("created_at", { ascending: false });
  if (error) return reply("Property drafts could not be loaded. Please try again.", 503);
  return Response.json({ drafts: data ?? [] }, { headers });
}

export async function POST(request: Request) {
  const session = await access(request);
  if ("response" in session && session.response) return session.response;
  const limit = propertyDraftsLimiter.checkDetailed(request, session.user.id);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many draft actions. Please wait a moment before trying again." },
      { status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  const body = await readBody(request);
  if (!body || typeof body.operationId !== "string" || !uuid.test(body.operationId) || !validPayload(body.payload)) return reply("Invalid draft request.", 400);
  const { data, error } = await session.supabase.rpc("save_property_draft", { p_operation_id: body.operationId, p_payload: body.payload });
  if (error?.code === "54000") return reply("Draft storage limit reached. Contact support for assistance.", 409);
  if (error?.code === "22023") return reply("The draft contains invalid or unsupported information.", 400);
  if (error) return reply(error.code === "23505" ? "This save operation conflicts with an earlier attempt." : "Draft could not be saved. Please retry.", error.code === "23505" ? 409 : 503);
  if (typeof data !== "string" || !uuid.test(data)) return reply("Draft save could not be confirmed. Please retry.", 503);
  revalidateLandlordPaths();
  return Response.json({ id: data }, { headers });
}

export async function PATCH(request: Request) {
  const session = await access(request);
  if ("response" in session && session.response) return session.response;
  const limit = propertyDraftsLimiter.checkDetailed(request, session.user.id);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many draft actions. Please wait a moment before trying again." },
      { status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  const body = await readBody(request);
  if (!body || typeof body.draftId !== "string" || !uuid.test(body.draftId) || typeof body.operationId !== "string" || !uuid.test(body.operationId) || !Number.isSafeInteger(body.revision) || (body.revision as number) < 1 || !validPayload(body.payload)) return reply("Invalid draft request.", 400);
  const { data, error } = await session.supabase.rpc("update_property_draft", { p_draft_id: body.draftId, p_operation_id: body.operationId, p_expected_revision: body.revision as number, p_payload: body.payload });
  if (error?.code === "54000") return reply("Draft storage limit reached. Contact support for assistance.", 409);
  if (error?.code === "22023") return reply("The draft contains invalid or unsupported information.", 400);
  if (error) return reply(error.code === "40001" || error.code === "23505" ? "This draft changed or the operation conflicts. Reload the saved draft before retrying." : "Draft could not be saved. Please retry.", error.code === "40001" || error.code === "23505" ? 409 : 503);
  if (!Number.isSafeInteger(data) || (data as number) < 1) return reply("Draft save could not be confirmed. Please retry.", 503);
  revalidateLandlordPaths();
  return Response.json({ revision: data }, { headers });
}
