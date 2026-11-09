import { adminRpc, jsonError, jsonOk, pageParams, requireActiveAdmin } from "@/server/admin-access";

const targetTypes = ["property", "listing", "account", "report"];

export async function GET(request: Request) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const params = new URL(request.url).searchParams;
  const targetType = params.get("targetType");
  const page = pageParams(params);
  if (!page || (targetType !== null && !targetTypes.includes(targetType))) return jsonError("Invalid audit filter.", 400);
  const { data, error } = await adminRpc(session.supabase, "admin_list_audit_logs", { p_target_type: targetType, p_limit: page.limit, p_offset: page.offset });
  if (error) return jsonError("The audit log could not be loaded. Please retry.", 503);
  return jsonOk({ entries: data });
}
