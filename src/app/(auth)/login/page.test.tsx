import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

describe("LoginPage", () => {
  it("shows confirmation after a successful password reset", async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({ message: "password_reset_success" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Your password has been reset. Sign in with your new password.");
    expect(html).toContain('role="status"');
  });

  it("does not show confirmation for an unknown message", async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({ message: "unknown" }) });
    const html = renderToStaticMarkup(page);

    expect(html).not.toContain("Your password has been reset.");
  });
});
