import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PasswordRequirements } from "./PasswordRequirements";
import { REGISTRATION_VALIDATION_RULES } from "@/types/auth";

describe("PasswordRequirements", () => {
  it("shows exactly the symbols accepted by the shared policy", () => {
    const html = renderToStaticMarkup(<PasswordRequirements id="policy" password="Abcdef1 " />);
    const symbols = Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32))
      .filter((character) => REGISTRATION_VALIDATION_RULES.password.classes.symbol.test(character)).join("");
    expect(html).toContain(symbols.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"));
    expect(html).toContain("Not met: </span>Symbol");
  });
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
