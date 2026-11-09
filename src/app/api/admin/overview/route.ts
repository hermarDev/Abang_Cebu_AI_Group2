import { adminRpc, jsonError, jsonOk, requireActiveAdmin } from "@/server/admin-access";

export async function GET(request: Request) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const { data, error } = await adminRpc(session.supabase, "admin_dashboard_overview");
  if (error) return jsonError("The admin overview could not be loaded. Please retry.", 503);
  return jsonOk({ overview: data });
}
