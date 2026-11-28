import type { NextConfig } from "next";

function getSupabaseFrameOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return "https://*.supabase.co";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://*.supabase.co";
  }
}

function getSupabaseConnectOrigins(): { httpsOrigin: string; wssOrigin: string } {
  const origin = getSupabaseFrameOrigin();
  if (origin === "https://*.supabase.co") {
    return { httpsOrigin: "https://*.supabase.co", wssOrigin: "wss://*.supabase.co" };
  }
  const wssOrigin = origin.startsWith("https://")
    ? `wss://${origin.slice("https://".length)}`
    : origin.startsWith("http://")
      ? `ws://${origin.slice("http://".length)}`
      : "wss://*.supabase.co";
  return { httpsOrigin: origin, wssOrigin };
}

const supabaseConnect = getSupabaseConnectOrigins();

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' blob: data: https: *.supabase.co",
          "font-src 'self' data:",
          `connect-src 'self' ${supabaseConnect.httpsOrigin} ${supabaseConnect.wssOrigin} https://*.supabase.co wss://*.supabase.co https://tiles.openfreemap.org https://photon.komoot.io`,
          "worker-src 'self' blob:",
          `frame-src 'self' ${getSupabaseFrameOrigin()} blob:`,
          "frame-ancestors 'none'",
          "object-src 'none'",
          "base-uri 'self'",
        ].join("; "),
      },
];

const nextConfig: NextConfig = {
  output: "standalone",
  ...(process.env.PLAYWRIGHT_TEST === "1" ? { devIndicators: false as const } : {}),
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
