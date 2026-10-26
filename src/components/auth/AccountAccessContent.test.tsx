import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AccountAccessContent, type AccountMode } from "@/components/auth/AccountAccessContent";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

afterEach(() => vi.unstubAllGlobals());

describe("AccountAccessContent", () => {
  it("presents the login choice with its heading and account switcher", () => {
    const html = renderToStaticMarkup(<AccountAccessContent mode="sign-in" onModeChange={vi.fn()} />);

    expect(html).toContain('class="_accountHeading_');
    expect(html).toContain("Welcome back");
    expect(html).toContain('role="group" aria-label="Account access"');
    expect(html).toContain('aria-pressed="true">Log In</button>');
    expect(html).toContain('aria-pressed="false">Register</button>');
    expect(html).not.toContain("Welcome Back");
    expect(html).not.toContain('class="w-full max-w-md mx-auto shadow-md"');
    expect(html).toContain(">Log In</button>");
    expect(html).not.toContain(">Renter</button>");
    expect(html).not.toContain(">Landlord</button>");
    expect(html).toContain("Forgot password?");
  });

  it("uses the same account-switcher heading and exposes the selected role only for signup", () => {
    const signUp = renderToStaticMarkup(<AccountAccessContent mode="sign-up" onModeChange={vi.fn()} />);
    const signIn = renderToStaticMarkup(<AccountAccessContent mode="sign-in" onModeChange={vi.fn()} />);
    expect(signUp).toContain("Create your account");
    expect(signUp).toContain('aria-label="Account type"');
    expect(signUp).toContain('aria-checked="true"');
    expect(signIn).toContain("Welcome back");
    expect(signIn).not.toContain('aria-label="Account type"');
  });

  it("changes login and registration from the shared account controls", () => {
    const modes: AccountMode[] = [];
    const tree = <AccountAccessContent mode="sign-in" onModeChange={(value) => modes.push(typeof value === "function" ? value("sign-in") : value)} />;
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Welcome back");
    expect(html).toContain(">Register</button>");
    expect(modes).toEqual([]);
  });

  it("renders the signup-only login prompt in the fixed footer", () => {
    const signUp = renderToStaticMarkup(<AccountAccessContent mode="sign-up" onModeChange={vi.fn()} />);
    expect(signUp).not.toContain("Already have an account?");
    expect(signUp).toContain("Create your account");
  });

  it("does not link to separate login or registration routes", () => {
    const html = renderToStaticMarkup(<AccountAccessContent mode="sign-in" onModeChange={vi.fn()} />);

    expect(html).toContain('aria-pressed="false">Register</button>');
    expect(html).not.toContain("Register here");
    expect(html).not.toContain('href="/register"');
    expect(html).not.toContain('href="/login"');
  });

  it("shows account creation inside the same account switcher", () => {
    const html = renderToStaticMarkup(<AccountAccessContent mode="sign-up" onModeChange={vi.fn()} />);

    expect(html).toContain('aria-pressed="false">Log In</button>');
    expect(html).toContain('aria-pressed="true">Register</button>');
    expect(html).toMatch(/class="[^"]*accountModeTabActive/);
    expect(html).toContain("Create your account");
    expect(html).not.toContain("Create an Account");
    expect(html).not.toContain("shadow-md");
    expect(html).toContain("Register as Renter");
    expect(html).toContain("Full Name");
    expect(html).toContain("Email Address");
  });

  it("keeps the login handoff available within the sign-up form", () => {
    const html = renderToStaticMarkup(<RegisterForm onLogin={vi.fn()} />);

    expect(html).toContain("Register as Renter");
    expect(html).not.toContain("Already have an account?");
  });
});
