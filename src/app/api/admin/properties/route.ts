import { createAdminClient } from "@/lib/supabase/admin";
import { adminRpc, jsonError, jsonOk, pageParams, requireActiveAdmin } from "@/server/admin-access";

const statuses = ["pending", "approved", "rejected", "archived", "all"];
const STORAGE_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f]{64}\.(?:jpg|png|webp|pdf)$/i;
const PHOTO_PATH = /\.(?:jpg|png|webp)$/i;

const paths = (value: unknown) => (Array.isArray(value) ? value.filter((p): p is string => typeof p === "string" && STORAGE_PATH.test(p)) : []);

export async function GET(request: Request) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const page = pageParams(params);
  if (!page || (status !== null && !statuses.includes(status))) return jsonError("Invalid property filter.", 400);
  const { data, error } = await adminRpc(session.supabase, "admin_list_properties", {
    p_status: status && status !== "all" ? status : null,
    p_search: params.get("search")?.trim() || null,
    p_limit: page.limit,
    p_offset: page.offset,
  });
  if (error || !Array.isArray(data)) return jsonError("Properties could not be loaded. Please retry.", 503);

  const rows = data as Array<Record<string, unknown>>;
  const photos = rows.map((row) => paths(row.photoPaths).filter((p) => PHOTO_PATH.test(p)));
  const permits = rows.map((row) => paths(row.permitPaths));
  const allPaths = [...new Set([...photos.flat(), ...permits.flat()])];
  const signed = new Map<string, string>();
  if (allPaths.length) {
    try {
      const { data: urls } = await createAdminClient().storage.from("property-draft-media").createSignedUrls(allPaths, 900);
      for (const entry of urls ?? []) if (entry?.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    } catch {
      // Degrade to empty media lists if signing fails.
    }
  }
  const urlsFor = (list: string[]) => list.map((p) => signed.get(p)).filter((u): u is string => Boolean(u));
  return jsonOk({ properties: rows.map((row, i) => ({ ...row, photoUrls: urlsFor(photos[i]), permitUrls: urlsFor(permits[i]) })) });
}
