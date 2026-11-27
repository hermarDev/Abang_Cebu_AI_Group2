export const MAX_UPLOAD_MULTIPART_BYTES = 11 * 1024 * 1024;

export async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false }> {
  const headerLen = request.headers.get("content-length");
  if (headerLen && /^\d+$/.test(headerLen.trim()) && Number(headerLen.trim()) > maxBytes) {
    return { ok: false };
  }

  if (!request.body) {
    return { ok: true, bytes: new Uint8Array(0) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false };
      }
      chunks.push(value);
    }
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes: out };
}

export async function readBoundedFormData(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; form: FormData } | { ok: false; reason: "too_large" | "invalid" }> {
  const bounded = await readBoundedBody(request, maxBytes);
  if (!bounded.ok) return { ok: false, reason: "too_large" };

  const contentType = request.headers.get("content-type");
  try {
    const form = await new Response(bounded.bytes as BodyInit, {
      headers: contentType ? { "content-type": contentType } : undefined,
    }).formData();
    return { ok: true, form };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
