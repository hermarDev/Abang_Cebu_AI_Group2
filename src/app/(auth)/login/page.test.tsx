import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

// SSR cannot render Radix portals; test route-to-form data flow inline.
vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

describe("LoginPage", () => {
  it.each(["expired_recovery_link", "invalid_recovery_link"])("explains %s", async (error) => {
    const page = await LoginPage({ searchParams: Promise.resolve({ error }) });
    expect(renderToStaticMarkup(page)).toContain("This password reset link is invalid or expired. Request a new link using Forgot password.");
  });
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
