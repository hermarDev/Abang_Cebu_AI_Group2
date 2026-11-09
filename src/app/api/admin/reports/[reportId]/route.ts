import { adminReportsLimiter, adminRpc, jsonError, jsonOk, rateLimited, readJsonObject, requireActiveAdmin, validUuid } from "@/server/admin-access";

type Context = { params: Promise<{ reportId: string }> };

// Each GET is an audited inspection of private chat evidence; a fresh operation id is one audit row.
export async function GET(request: Request, context: Context) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const { reportId } = await context.params;
  const supplied = new URL(request.url).searchParams.get("operationId");
  if (!validUuid(reportId) || (supplied !== null && !validUuid(supplied))) return jsonError("Invalid report request.", 400);
  const { data, error } = await adminRpc(session.supabase, "admin_get_abuse_report_detail", { p_report_id: reportId, p_operation_id: supplied ?? crypto.randomUUID() });
  if (error?.code === "42501") return jsonError("This report cannot be opened.", 403);
  if (error?.code === "23505") return jsonError("That operation was already used. Reload and retry.", 409);
  if (error?.code === "22023") return jsonError("Report not found.", 404);
  if (error) return jsonError("The report could not be loaded. Please retry.", 503);
  return jsonOk({ report: data });
}

export async function POST(request: Request, context: Context) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const limited = rateLimited(adminReportsLimiter, request, session.user.id);
  if (limited) return limited;
  const { reportId } = await context.params;
  const input = await readJsonObject(request);
  const { suspendTargetUser = false, unpublishTargetListing = false } = input ?? {};
  if (!input || !validUuid(reportId) || !validUuid(input.operationId) || (input.decision !== "resolved" && input.decision !== "dismissed")
    || typeof suspendTargetUser !== "boolean" || typeof unpublishTargetListing !== "boolean") return jsonError("Invalid report request.", 400);
  const note = typeof input.resolutionNote === "string" ? input.resolutionNote.trim() : "";
  if (note.length < 5 || note.length > 1000) return jsonError("Provide a resolution note of 5 to 1,000 characters.", 400);
  const { data, error } = await adminRpc(session.supabase, "admin_resolve_abuse_report", {
    p_report_id: reportId, p_operation_id: input.operationId, p_decision: input.decision, p_resolution_note: note,
    p_suspend_target_user: suspendTargetUser, p_unpublish_target_listing: unpublishTargetListing,
  });
  if (error?.code === "42501") return jsonError("This report cannot be modified.", 403);
  if (error?.code === "23505" || error?.code === "40001") return jsonError("This report changed or the operation was already used. Reload and retry.", 409);
  if (error?.code === "22023") return jsonError("Invalid report request.", 400);
  if (error) return jsonError("The decision could not be confirmed. Reload before retrying.", 503);
  return jsonOk({ report: data });
}
