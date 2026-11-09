import { adminRpc, jsonError, jsonOk, pageParams, requireActiveAdmin } from "@/server/admin-access";

const STATUSES = ["open", "in_review", "resolved", "dismissed", "all"];

export async function GET(request: Request) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const page = pageParams(params);
  if (!page || (status !== null && !STATUSES.includes(status))) return jsonError("Invalid report filter.", 400);
  const { data, error } = await adminRpc(session.supabase, "admin_list_abuse_reports", { p_status: status, p_limit: page.limit, p_offset: page.offset });
  if (error?.code === "42501") return jsonError("Admin workspace access is restricted to active administrators.", 403);
  if (error) return jsonError("Reports could not be loaded. Please retry.", 503);
  return jsonOk({ reports: data });
}
