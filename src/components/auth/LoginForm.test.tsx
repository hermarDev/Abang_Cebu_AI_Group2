import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

describe("LoginForm", () => {
  it("offers a standalone login card with the canonical action labels", () => {
    const html = renderToStaticMarkup(<LoginForm />);
    expect(html).toContain("Welcome Back");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain("Log in to your AbangCebu account");
    expect(html).not.toContain("Sign In");
    expect(html).not.toContain("Register here");
    expect(html).not.toContain('role="tablist" aria-label="User role selection"');
    expect(html).not.toContain("Choose the role linked to your account.");
    expect(html).not.toContain(">Renter</button>");
    expect(html).not.toContain(">Landlord</button>");
  });

  it("renders without a nested card, repeated welcome, or duplicate account prompt when embedded", () => {
    const html = renderToStaticMarkup(<LoginForm onRegister={() => undefined} />);

    expect(html).not.toContain('class="w-full max-w-md mx-auto shadow-md"');
    expect(html).not.toContain("Welcome Back");
    expect(html).not.toContain("Don&apos;t have an account?");
    expect(html).not.toContain("Register here");
    expect(html).toContain(">Log In</button>");
    expect(html).not.toContain('role="tab"');
    expect(html).not.toContain("User role selection");
  });

  it("shows password-reset success feedback when provided", () => {
    const html = renderToStaticMarkup(
      <LoginForm statusMessage="Your password has been reset. Sign in with your new password." />,
    );

    expect(html).toContain("Your password has been reset. Sign in with your new password.");
    expect(html).toContain('role="status"');
  });
});
