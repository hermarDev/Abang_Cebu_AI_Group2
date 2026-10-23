import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

describe("LoginForm", () => {
  it("offers email credentials, account creation, and password recovery", () => {
    const html = renderToStaticMarkup(<LoginForm />);
    expect(html).toContain("Welcome Back");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain("Forgot password?");
    expect(html).toContain("Register here");
  });

  it("shows password-reset success feedback when provided", () => {
    const html = renderToStaticMarkup(
      <LoginForm statusMessage="Your password has been reset. Sign in with your new password." />,
    );

    expect(html).toContain("Your password has been reset. Sign in with your new password.");
    expect(html).toContain('role="status"');
  });
});
