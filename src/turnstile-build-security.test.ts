import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Turnstile build configuration", () => {
  it("keeps the site key but never passes the secret to the image build", () => {
    for (const path of ["Dockerfile", ".github/workflows/deploy.yml"]) {
      const content = readFileSync(path, "utf8");
      expect(content).toContain("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
      expect(content).not.toMatch(/(?<![A-Z0-9_])TURNSTILE_SECRET_KEY\b/);
    }
  });
});
