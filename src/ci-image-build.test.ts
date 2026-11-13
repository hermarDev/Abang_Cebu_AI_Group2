import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function dockerBuild(args: string[]) {
  const tar = execFileSync("git", ["archive", "HEAD"], { maxBuffer: 1024 * 1024 * 1024 });
  return execFileSync("docker", ["build", "--target", "builder", "--progress=plain", ...args, "-"], { input: tar, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 1024 * 1024 * 512 });
}

function dockerBuildError(args: string[]) {
  try {
    dockerBuild(args);
  } catch (error) {
    return String((error as { stdout?: string }).stdout) + String((error as { stderr?: string }).stderr);
  }
  throw new Error("Docker build unexpectedly passed");
}

describe("CI Docker build validator", () => {
  it("runs validator in a builder image before Next.js build", () => {
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(ci).toMatch(/name: Run Docker build validator[\s\S]*?docker build --target builder[\s\S]*?NEXT_PUBLIC_SUPABASE_URL=https:\/\/example\.supabase\.co/);
  });

  it("accepts synthetic non-placeholder HTTPS Supabase config in the Docker builder", { timeout: 300_000 }, () => {
    expect(dockerBuild(["--build-arg", "NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co", "--build-arg", "NEXT_PUBLIC_SUPABASE_ANON_KEY=synthetic-public-key"])).not.toContain("Invalid public Supabase build configuration");
  });

  it("rejects placeholder Supabase config in the Docker builder", { timeout: 300_000 }, () => {
    const output = dockerBuildError([]);
    expect(output).toContain("Invalid public Supabase build configuration");
  });
});
