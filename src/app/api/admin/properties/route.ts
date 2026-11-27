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
  const proofPaths = [...new Set(rows.flatMap((row) => Array.isArray(row.fieldVerificationProof)
    ? row.fieldVerificationProof.flatMap((proof) => proof && typeof proof === "object" && typeof proof.object_path === "string" ? [proof.object_path as string] : [])
    : []))];
  const signed = new Map<string, string>();
  const proofSigned = new Map<string, string>();
  const signBucket = async (bucket: string, bucketPaths: string[], target: Map<string, string>) => {
    if (!bucketPaths.length) return;
    try {
      const { data: urls } = await createAdminClient().storage.from(bucket).createSignedUrls(bucketPaths, 900);
      for (const entry of urls ?? []) if (entry?.path && entry.signedUrl) target.set(entry.path, entry.signedUrl);
    } catch {
      // Degrade to empty media URLs when signing fails.
    }
  };
  await Promise.all([
    signBucket("property-draft-media", allPaths, signed),
    signBucket("field-verification-media", proofPaths, proofSigned),
  ]);
  const urlsFor = (list: string[]) => list.map((p) => signed.get(p)).filter((u): u is string => Boolean(u));
  return jsonOk({ properties: rows.map((row, i) => ({
    ...row,
    photoUrls: urlsFor(photos[i]),
    permitUrls: urlsFor(permits[i]),
    fieldVerificationProof: Array.isArray(row.fieldVerificationProof)
      ? row.fieldVerificationProof.map((proof) => proof && typeof proof === "object" && typeof proof.object_path === "string"
        ? { ...proof, signedUrl: proofSigned.get(proof.object_path) ?? null } : proof)
      : row.fieldVerificationProof,
  })) });
}
