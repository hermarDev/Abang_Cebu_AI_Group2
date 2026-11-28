import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const RSC_REFRESH_LEEWAY_MS = 90_000;

function decodeBase64Url(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function extractJwtExpMs(rawCookieValue: string): number | null {
  const candidates = [rawCookieValue];
  if (rawCookieValue.includes("%")) {
    try {
      candidates.push(decodeURIComponent(rawCookieValue));
    } catch {
      // Ignore malformed percent-encoding.
    }
  }

  for (const candidate of candidates) {
    const decoded = candidate.startsWith("base64-")
      ? decodeBase64Url(candidate.slice("base64-".length))
      : candidate;
    if (!decoded) continue;

    let accessToken: string | null = null;
    const trimmed = decoded.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed) && typeof parsed[0] === "string") {
          accessToken = parsed[0];
        } else if (parsed && typeof parsed === "object" && typeof (parsed as { access_token?: unknown }).access_token === "string") {
          accessToken = (parsed as { access_token: string }).access_token;
        }
      } catch {
        accessToken = null;
      }
    } else if (trimmed.split(".").length === 3) {
      accessToken = trimmed;
    }

    if (!accessToken) continue;
    const parts = accessToken.split(".");
    if (parts.length !== 3) continue;
    const payloadText = decodeBase64Url(parts[1]);
    if (!payloadText) continue;
    try {
      const payload: unknown = JSON.parse(payloadText);
      if (payload && typeof payload === "object") {
        const exp = (payload as { exp?: unknown }).exp;
        if (typeof exp === "number" && Number.isFinite(exp)) {
          return exp * 1000;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function collectSupabaseAuthCookieValues(request: NextRequest): string[] {
  const unchunked = new Map<string, string>();
  const chunked = new Map<string, Array<{ index: number; value: string }>>();

  for (const { name, value } of request.cookies.getAll()) {
    if (!name.startsWith("sb-") || name.endsWith("-code-verifier")) continue;
    const match = /^(sb-.+?)\.(\d+)$/.exec(name);
    if (match) {
      const baseName = match[1];
      const list = chunked.get(baseName) ?? [];
      list.push({ index: Number(match[2]), value });
      chunked.set(baseName, list);
    } else {
      unchunked.set(name, value);
    }
  }

  const values: string[] = [...unchunked.values()];
  for (const [baseName, chunks] of chunked.entries()) {
    if (unchunked.has(baseName)) continue;
    chunks.sort((a, b) => a.index - b.index);
    values.push(chunks.map((chunk) => chunk.value).join(""));
  }
  return values;
}

/**
 * Skips GoTrue session refresh on RSC navigations only when a valid Supabase JWT
 * still has >90s remaining; expired, near-expiry, or unreadable cookies must
 * run `updateSession` so rotated refresh tokens are persisted via Set-Cookie.
 */
export function shouldSkipRscSessionRefresh(request: NextRequest): boolean {
  if (!request.nextUrl.searchParams.has("_rsc")) return false;
  const values = collectSupabaseAuthCookieValues(request);
  if (values.length === 0) return false;
  const now = Date.now();
  return values.some((value) => {
    const expMs = extractJwtExpMs(value);
    return expMs !== null && expMs - now > RSC_REFRESH_LEEWAY_MS;
  });
}

export async function middleware(request: NextRequest) {
  let response: NextResponse;
  if (
    shouldSkipRscSessionRefresh(request) ||
    request.nextUrl.pathname.startsWith("/api/") ||
    !request.cookies.getAll().some(({ name }) => name.startsWith("sb-"))
  ) {
    response = NextResponse.next({ request });
  } else {
    response = await updateSession(request);
  }
  if (["/", "/map", "/login", "/register"].includes(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
