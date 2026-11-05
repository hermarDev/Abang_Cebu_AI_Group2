import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PasswordRequirements } from "./PasswordRequirements";

describe("PasswordRequirements", () => {
  it("updates each check against the shared policy", () => {
    const html = renderToStaticMarkup(<PasswordRequirements id="policy" password="Abcdef12" />);
    expect(html).toContain("Met: </span>8–72 characters");
    expect(html).toContain("Met: </span>Uppercase letter");
    expect(html).toContain("Met: </span>Lowercase letter");
    expect(html).toContain("Met: </span>Number");
    expect(html).toContain("Not met: </span>Symbol");
    const complete = renderToStaticMarkup(<PasswordRequirements id="policy" password="Abcdef1!" />);
    expect(complete).not.toContain("Not met:");
    expect(complete).toContain("Met: </span>Symbol");
  });
});
