import { adminLifecycleLimiter, adminRpc, jsonError, jsonOk, rateLimited, readJsonObject, requireActiveAdmin, validReason, validUuid } from "@/server/admin-access";

export async function POST(request: Request) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const limited = rateLimited(adminLifecycleLimiter, request, session.user.id);
  if (limited) return limited;
  const input = await readJsonObject(request);
  if (!input || !validUuid(input.propertyId) || !validUuid(input.operationId) || (input.action !== "unpublish" && input.action !== "restore" && input.action !== "correct_location")) {
    return jsonError("Invalid property lifecycle request.", 400);
  }
  if (!validReason(input.reason)) return jsonError("Provide a reason of at least 5 characters.", 400);

  if (input.action === "correct_location") {
    const lat = typeof input.latitude === "number" && Number.isFinite(input.latitude) && input.latitude >= -90 && input.latitude <= 90 ? input.latitude : null;
    const lon = typeof input.longitude === "number" && Number.isFinite(input.longitude) && input.longitude >= -180 && input.longitude <= 180 ? input.longitude : null;
    const address = typeof input.streetAddress === "string" && input.streetAddress.trim() ? input.streetAddress.trim() : null;
    const barangay = typeof input.barangay === "string" && input.barangay.trim() ? input.barangay.trim() : null;
    const city = typeof input.city === "string" && input.city.trim() ? input.city.trim() : null;
    if (lat === null || lon === null || !address || !barangay || !city) return jsonError("Provide valid coordinates, address, and barangay.", 400);
    const { data, error } = await adminRpc(session.supabase, "admin_update_property_location", {
      p_property_id: input.propertyId,
      p_operation_id: input.operationId,
      p_street_address: address,
      p_barangay: barangay,
      p_city: city,
      p_latitude: lat,
      p_longitude: lon,
      p_reason: input.reason.trim(),
    });
    if (error?.code === "23505") return jsonError("This property changed or the operation was already used. Reload and retry.", 409);
    if (error?.code === "42501") return jsonError("This property cannot be changed.", 403);
    if (error?.code === "22023") return jsonError("Invalid location correction request.", 400);
    if (error) return jsonError("The location correction could not be saved.", 503);
    return jsonOk({ propertyId: input.propertyId, status: (data as { status?: string })?.status ?? "approved" });
  }

  const { data, error } = await adminRpc(session.supabase, "admin_set_property_lifecycle", {
    p_property_id: input.propertyId,
    p_operation_id: input.operationId,
    p_action: input.action,
    p_reason: input.reason.trim(),
  });
  if (error?.code === "23505" || error?.code === "40001") return jsonError("This property changed or the operation was already used. Reload and retry.", 409);
  if (error?.code === "42501") return jsonError("This property cannot be changed.", 403);
  if (error?.code === "22023") return jsonError("Invalid property lifecycle request.", 400);
  const result = data as { propertyId?: unknown; status?: unknown } | null;
  if (error || !result || typeof result !== "object") return jsonError("The change could not be confirmed. Reload before retrying.", 503);
  return jsonOk({ propertyId: result.propertyId, status: result.status });
}
