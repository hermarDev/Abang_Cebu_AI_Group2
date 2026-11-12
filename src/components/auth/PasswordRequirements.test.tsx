import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PasswordRequirements } from "./PasswordRequirements";

describe("PasswordRequirements", () => {
  it("renders the reference wording for every requirement", () => {
    const html = renderToStaticMarkup(<PasswordRequirements id="policy" password="Abcdef1!" />);
    for (const label of [
      "The password must be at least 8 characters.",
      "The password must contain at least one uppercase and one lowercase letter.",
      "The password must contain at least one symbol.",
      "The password must contain at least one number.",
    ]) expect(html).toContain(label);
  });

  it("marks each requirement met only when the shared policy is satisfied", () => {
    const partial = renderToStaticMarkup(<PasswordRequirements id="policy" password="abcdef12" />);
    expect(partial).toContain("The password must be at least 8 characters.");
    expect(partial).toContain("The password must contain at least one uppercase and one lowercase letter.");
    expect(partial).toContain("The password must contain at least one symbol.");
    expect(partial).toContain("The password must contain at least one number.");
    expect((partial.match(/aria-label="Requirement met"/g) ?? [])).toHaveLength(2);
    expect((partial.match(/aria-label="Requirement not met"/g) ?? [])).toHaveLength(2);

    const onlyUpper = renderToStaticMarkup(<PasswordRequirements id="policy" password="ABCDEFGH12" />);
    expect((onlyUpper.match(/aria-label="Requirement met"/g) ?? [])).toHaveLength(2);
    expect((onlyUpper.match(/aria-label="Requirement not met"/g) ?? [])).toHaveLength(2);

    const complete = renderToStaticMarkup(<PasswordRequirements id="policy" password="Abcdef1!" />);
    expect((complete.match(/aria-label="Requirement met"/g) ?? [])).toHaveLength(4);
    expect(complete).not.toContain("Requirement not met");
  });

  it("does not expose the old glyph or state prefixes", () => {
    const html = renderToStaticMarkup(<PasswordRequirements id="policy" password="Abc" />);
    expect(html).not.toContain("Not met:");
    expect(html).not.toContain("Met: ");
    expect(html).not.toContain("○");
    expect(html).not.toContain("✓");
  });

  it("conditionally displays the confirmation requirement when confirmPassword is provided", () => {
    const withoutConfirm = renderToStaticMarkup(<PasswordRequirements id="policy" password="Abc" />);
    expect(withoutConfirm).not.toContain("The password and confirmation must match.");

    const mismatch = renderToStaticMarkup(<PasswordRequirements id="policy" password="Password1!" confirmPassword="Different1!" />);
    expect(mismatch).toContain("The password and confirmation must match.");
    expect(mismatch).toContain('aria-label="Requirement not met"');

    const match = renderToStaticMarkup(<PasswordRequirements id="policy" password="Password1!" confirmPassword="Password1!" />);
    expect(match).toContain("The password and confirmation must match.");
    expect(match).not.toContain("Requirement not met");

    const bothEmpty = renderToStaticMarkup(<PasswordRequirements id="policy" password="" confirmPassword="" />);
    expect(bothEmpty).toContain('aria-label="Requirement not met"');
  });
});
