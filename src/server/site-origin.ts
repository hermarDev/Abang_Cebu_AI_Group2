export function getSiteOrigin(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) throw new Error("Site origin is required");
  const url = new URL(siteUrl);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && (process.env.NODE_ENV === "production" || url.protocol !== "http:"))) {
    throw new Error("Invalid site origin");
  }
  return url.origin;
}
