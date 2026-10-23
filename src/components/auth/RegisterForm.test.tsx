import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./RegisterForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("RegisterForm", () => {
  it("limits the Philippine mobile number input to 11 characters", () => {
    const html = renderToStaticMarkup(<RegisterForm />);
    expect(html).toContain('type="tel"');
    expect(html).toContain('maxLength="11"');
  });
});
