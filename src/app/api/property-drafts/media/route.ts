import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inspectDraftMedia } from "../media-validation";

const headers = { "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });

async function access(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: reply("Sign in to upload listing files.", 401) } as const;
  if (request.headers.get("x-expected-user-id") !== user.id) return { response: reply("Your account changed. Please refresh and try again.", 409) } as const;
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError) return { response: reply("Your account could not be checked. Please try again.", 503) } as const;
  if (profile?.role !== "landlord" || profile.is_suspended) return { response: reply("Listing files are available to active landlord accounts only.", 403) } as const;
  return { supabase, user } as const;
}

export async function GET(request: Request) {
  const session = await access(request);
  if ("response" in session && session.response) return session.response;
  const draftId = new URL(request.url).searchParams.get("draftId");
  if (!draftId || !uuid.test(draftId)) return reply("Invalid media request.", 400);
  const { data: owned, error: ownedError } = await session.supabase.from("property_drafts").select("id").eq("id", draftId).eq("owner_id", session.user.id).maybeSingle();
  if (ownedError) return reply("Listing files could not be loaded. Please retry.", 503);
  if (!owned) return reply("This draft is unavailable.", 404);
  const { data, error } = await session.supabase.from("property_draft_media").select("operation_id,kind,content_type,size_bytes,content_sha256,object_path,original_name").eq("draft_id", draftId).eq("confirmed", true).order("created_at");
  if (error) return reply("Listing files could not be loaded. Please retry.", 503);
  const media = [];
  for (const row of data ?? []) {
    if (!row || typeof row !== "object" || typeof row.operation_id !== "string" || !uuid.test(row.operation_id) || typeof row.content_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(row.content_sha256) || (row.kind !== "photo" && row.kind !== "permit") || typeof row.size_bytes !== "number" || !Number.isSafeInteger(row.size_bytes) || row.size_bytes < 1 || row.size_bytes > 10485760) return reply("Listing files could not be loaded. Please retry.", 503);
    const extension = row.content_type === "application/pdf" && row.kind === "permit" ? "pdf" : row.content_type === "image/png" ? "png" : row.content_type === "image/webp" ? "webp" : row.content_type === "image/jpeg" ? "jpg" : null;
    if (!extension || row.object_path !== `${session.user.id}/${draftId}/${row.operation_id}/${row.content_sha256}.${extension}`) return reply("Listing files could not be loaded. Please retry.", 503);
    try {
      const { data: signed, error: signError } = await createAdminClient().storage.from("property-draft-media").createSignedUrl(row.object_path, 300);
      if (signError || !signed?.signedUrl) return reply("Listing files could not be loaded. Please retry.", 503);
      media.push({ operationId: row.operation_id, kind: row.kind, contentType: row.content_type, sizeBytes: row.size_bytes, sha256: row.content_sha256, originalName: typeof row.original_name === "string" && row.original_name ? row.original_name : null, signedUrl: signed.signedUrl });
    } catch {
      return reply("Listing files could not be loaded. Please retry.", 503);
    }
  }
  return Response.json({ media }, { headers });
}

export async function DELETE(request: Request) {
  const session = await access(request);
  if ("response" in session && session.response) return session.response;
  let body: unknown;
  try { body = await request.json(); } catch { return reply("Invalid media request.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("draftId" in body) || typeof body.draftId !== "string" || !uuid.test(body.draftId) || !("operationId" in body) || typeof body.operationId !== "string" || !uuid.test(body.operationId)) return reply("Invalid media request.", 400);
  try {
    const { data, error } = await session.supabase.rpc("release_property_draft_media", { p_draft_id: body.draftId, p_operation_id: body.operationId });
    if (error || (data !== "released" && data !== "confirmed" && data !== "missing")) return reply("The file status could not be confirmed. Retry the same request.", 503);
    return Response.json({ state: data }, { headers });
  } catch {
    return reply("The file status could not be confirmed. Retry the same request.", 503);
  }
}

export async function POST(request: Request) {
  const session = await access(request);
  if ("response" in session && session.response) return session.response;
  let form: FormData;
  try { form = await request.formData(); } catch { return reply("Invalid file request.", 400); }
  const draftId = form.get("draftId");
  const operationId = form.get("operationId");
  const kind = form.get("kind");
  const file = form.get("file");
  if (typeof draftId !== "string" || !uuid.test(draftId) || typeof operationId !== "string" || !uuid.test(operationId) || (kind !== "photo" && kind !== "permit") || !(file instanceof File)) return reply("Invalid media request.", 400);
  if (file.size === 0 || file.size > 10 * 1024 * 1024) return reply("Choose a supported file no larger than 10 MB.", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = inspectDraftMedia(kind, file.type, bytes);
  if (!contentType) return reply("Choose a supported file no larger than 10 MB.", 400);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const { data: owned, error: ownedError } = await session.supabase.from("property_drafts").select("id,revision").eq("id", draftId).eq("owner_id", session.user.id).maybeSingle();
  if (ownedError) return reply("Listing files could not be prepared. Please retry.", 503);
  if (!owned) return reply("This draft is unavailable.", 404);
  const objectPath = `${session.user.id}/${draftId}/${operationId}/${sha256}.${contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg"}`;
  const originalName = file.name;
  if (!originalName || Buffer.byteLength(originalName, "utf8") > 255 || /[\u0000-\u001f\u007f/\\]/.test(originalName)) return reply("Choose a file with a valid name of at most 255 bytes.", 400);
  const { data: prepared, error: prepareError } = await session.supabase.rpc("prepare_property_draft_media", {
    p_draft_id: draftId,
    p_operation_id: operationId,
    p_kind: kind,
    p_content_type: contentType,
    p_size_bytes: bytes.length,
    p_sha256: sha256,
    p_object_path: objectPath,
    p_original_name: originalName,
  });
  if (prepareError?.code === "23505") return reply("This upload operation conflicts with an earlier attempt.", 409);
  if (prepareError?.code === "22023" || prepareError?.code === "54000") return reply("The selected files cannot be saved for this draft.", 400);
  if (prepareError || !prepared || typeof prepared !== "object") return reply("Listing files could not be prepared. Please retry.", 503);
  const stored = prepared as { objectPath: string; sha256: string; resumed?: boolean; confirmed?: boolean };
  if (stored.objectPath !== objectPath || stored.sha256 !== sha256 || (stored.confirmed !== undefined && typeof stored.confirmed !== "boolean")) return reply("Listing files could not be prepared. Please retry.", 503);
  try {
    const storage = createAdminClient().storage.from("property-draft-media");
    if (!stored.confirmed) {
      const { error: uploadError } = await storage.upload(stored.objectPath, file, { contentType, upsert: false });
      if (uploadError && uploadError.status !== 409) return reply("The file could not be saved. Please retry.", 503);
    }
    const { data: existing, error: downloadError } = await storage.download(stored.objectPath);
    if (downloadError || !existing || existing.size !== bytes.length) return reply("The file could not be saved. Please retry.", 503);
    const existingHash = createHash("sha256").update(new Uint8Array(await existing.arrayBuffer())).digest("hex");
    if (existingHash !== sha256) return reply("The file could not be saved. Please retry.", 503);
  } catch {
    return reply("The file could not be saved. Please retry.", 503);
  }
  try {
    const { error: confirmError } = await createAdminClient().rpc("confirm_property_draft_media", { p_owner_id: session.user.id, p_draft_id: draftId, p_operation_id: operationId, p_sha256: sha256, p_object_path: stored.objectPath });
    if (confirmError) return reply(confirmError.code === "23505" ? "This upload operation conflicts with an earlier attempt." : "The file confirmation could not be verified. Retry the same upload.", confirmError.code === "23505" ? 409 : 503);
  } catch {
    return reply("The file confirmation could not be verified. Retry the same upload.", 503);
  }
  return Response.json({ objectPath: stored.objectPath, sha256, sizeBytes: bytes.length, contentType }, { headers });
}
