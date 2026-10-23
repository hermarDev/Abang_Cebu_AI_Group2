import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AccountAccessContent } from "@/components/auth/AccountAccessContent";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

afterEach(() => vi.unstubAllGlobals());

describe("AccountAccessContent", () => {
  it("shows sign-in and signup as one blue-styled account switcher", () => {
    const html = renderToStaticMarkup(<AccountAccessContent mode="sign-in" onModeChange={vi.fn()} />);

    expect(html).toContain('role="group" aria-label="Account access"');
    expect(html).toContain('aria-pressed="true">Sign in</button>');
    expect(html).toContain('aria-pressed="false">Sign up</button>');
    expect(html).toContain('style="--action:#2563eb;--action-foreground:#ffffff;--action-hover:#1d4ed8"');
    expect(html).toContain("Welcome Back");
    expect(html).toContain("Forgot password?");
  });

  it("does not link to separate login or registration routes", () => {
    const html = renderToStaticMarkup(<AccountAccessContent mode="sign-in" onModeChange={vi.fn()} />);

    expect(html).toContain("Register here");
    expect(html).not.toContain('href="/register"');
    expect(html).not.toContain('href="/login"');
  });

  it("shows account creation inside the same account switcher", () => {
    const html = renderToStaticMarkup(<AccountAccessContent mode="sign-up" onModeChange={vi.fn()} />);

    expect(html).toContain('aria-pressed="false">Sign in</button>');
    expect(html).toContain('aria-pressed="true">Sign up</button>');
    expect(html).toMatch(/class="[^"]*accountModeTabActive/);
    expect(html).toContain("Create an Account");
    expect(html).toContain("Full Name");
    expect(html).toContain("Email Address");
  });

  it("keeps the login handoff available within the sign-up form", () => {
    const html = renderToStaticMarkup(<RegisterForm onLogin={vi.fn()} />);

    expect(html).toContain("Register as Renter");
    expect(html).toContain("Already have an account?");
  });
});
