import {
  adminRpc,
  jsonError,
  jsonOk,
  pageParams,
  requireActiveAdmin,
} from "@/server/admin-access";

const STATUSES = ["open", "in_progress", "resolved", "closed", "all"] as const;
const CATEGORIES = [
  "all",
  "account_access",
  "rental_search",
  "listing_submission",
  "messaging_safety",
  "bug_report",
  "billing_or_policy",
  "other",
] as const;

export async function GET(request: Request) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;

  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const category = params.get("category");
  const search = params.get("search");
  const page = pageParams(params);

  if (!page || (status !== null && !STATUSES.includes(status as (typeof STATUSES)[number]))) {
    return jsonError("Invalid support ticket filter.", 400);
  }

  if (category !== null && !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return jsonError("Invalid support ticket category filter.", 400);
  }

  const { data, error } = await adminRpc(
    session.supabase,
    "admin_list_support_tickets",
    {
      p_status: status,
      p_category: category,
      p_search: search,
      p_limit: page.limit,
      p_offset: page.offset,
    },
  );

  if (error?.code === "42501") {
    return jsonError("Admin workspace access is restricted to active administrators.", 403);
  }
  if (error) {
    return jsonError("Support tickets could not be loaded. Please retry.", 503);
  }

  return jsonOk({ tickets: data });
}
