const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
let valid = false;
try {
  const parsed = new URL(url);
  valid = parsed.protocol === "https:" && !parsed.username && !parsed.password &&
    parsed.hostname !== "placeholder.supabase.co" && parsed.pathname === "/" && !parsed.search && !parsed.hash &&
    !!key && key !== "placeholder-anon-key";
} catch {
  // Invalid or absent URL is rejected below.
}
if (!valid) {
  console.error("Invalid public Supabase build configuration.");
  process.exitCode = 1;
}
