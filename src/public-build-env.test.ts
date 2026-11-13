import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = "scripts/validate-public-build-env.mjs";
const run = (url: string, key: string) => spawnSync(process.execPath, [script], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key },
  encoding: "utf8",
});

describe("production public build configuration", () => {
  it.each([
    ["", "public-key"],
    ["https://placeholder.supabase.co", "public-key"],
    ["https://project.supabase.co", ""],
    ["https://project.supabase.co", "placeholder-anon-key"],
    ["http://project.example", "public-key"],
    ["not-a-url", "public-key"],
  ])("rejects missing, placeholder or invalid config", (url, key) => {
    const result = run(url, key);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Invalid public Supabase build configuration");
  });

  it("accepts an HTTPS origin and non-placeholder public key", () => {
    expect(() => execFileSync(process.execPath, [script], { env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key" } })).not.toThrow();
  });

  it("validates before building the image", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    expect(dockerfile).toMatch(/RUN node scripts\/validate-public-build-env\.mjs\s*\n\s*RUN pnpm run build/);
  });
});
