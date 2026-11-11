import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), signIn: vi.fn(), state: [] as unknown[], cursor: { i: 0, simulate: false } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh, push: vi.fn() }),
}));
vi.mock("@/lib/auth/sign-in", () => ({
  getPostLoginRedirect: (_next: string | null, role: string) => role === "landlord" ? "/landlord/dashboard" : "/",
  signInWithEmail: mocks.signIn,
}));
// No DOM library is installed, so when `simulate` is on, useState is backed by a plain array and LoginForm is called directly.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useId: () => (mocks.cursor.simulate ? "id" : actual.useId()),
    useState: (init: unknown) => {
      if (!mocks.cursor.simulate) return actual.useState(init);
      const i = mocks.cursor.i++;
      if (!(i in mocks.state)) mocks.state[i] = init;
      return [mocks.state[i], (value: unknown) => { mocks.state[i] = typeof value === "function" ? (value as (v: unknown) => unknown)(mocks.state[i]) : value; }];
    },
  };
});

type Node = ReactElement<{ children?: ReactNode; [key: string]: unknown }>;
const walk = (node: ReactNode, visit: (element: Node) => void) => {
  if (Array.isArray(node)) return node.forEach((child) => walk(child, visit));
  if (node && typeof node === "object" && "props" in node) { visit(node as Node); walk((node as Node).props.children, visit); }
};
const render = () => {
  mocks.cursor.i = 0;
  const tree = LoginForm() as Node;
  let form: Node | undefined; let submit: Node | undefined; const texts: string[] = [];
  const collect = (node: ReactNode) => { if (typeof node === "string") texts.push(node); else if (Array.isArray(node)) node.forEach(collect); else if (node && typeof node === "object" && "props" in node) collect((node as Node).props.children); };
  walk(tree, (el) => { if (el.type === "form") form = el; if (el.props.type === "submit") submit = el; });
  collect(tree);
  return { form: form!, submit: submit!, text: texts.join("|") };
};

describe("LoginForm", () => {
  it("offers a standalone login card with the canonical action labels", () => {
    const html = renderToStaticMarkup(<LoginForm />);
    expect(html).toContain("Welcome Back");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain('placeholder="Enter your email address"');
    expect(html).toContain('placeholder="Enter your password"');
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

  it("uses a labeled eye button instead of text to reveal the password", () => {
    const html = renderToStaticMarkup(<LoginForm onRegister={() => undefined} />);

    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain('class="lucide lucide-eye');
    expect(html).toContain("min-h-11 min-w-11");
    expect(html).not.toContain(">Show</button>");
    expect(html).not.toContain(">Hide</button>");
  });

  it("shows password-reset success feedback when provided", () => {
    const html = renderToStaticMarkup(
      <LoginForm statusMessage="Your password has been reset. Sign in with your new password." />,
    );

    expect(html).toContain("Your password has been reset. Sign in with your new password.");
    expect(html).toContain('role="status"');
  });
  it("stays in the redirecting state after a successful sign-in and resets on failure", async () => {
    vi.stubGlobal("window", { location: { search: "" } });
    vi.stubGlobal("document", { getElementById: () => null });
    const attempt = async (result: unknown) => {
      mocks.state.length = 0;
      mocks.signIn.mockResolvedValueOnce(result);
      // State slots in declaration order: showPassword, email, password.
      render();
      mocks.state[1] = "a@b.co"; mocks.state[2] = "secret";
      await (render().form.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: () => undefined });
      return render();
    };
    mocks.cursor.simulate = true;
    try {
      const ok = await attempt({ success: true, role: "landlord" });
      expect(ok.text).toContain("Signing in · Preparing your workspace…");
      expect(ok.text).not.toContain("Log In");
      expect(ok.submit.props.disabled).toBe(true);
      expect(ok.submit.props["aria-busy"]).toBe(true);
      expect(mocks.replace).toHaveBeenCalledWith("/landlord/dashboard");
      expect(mocks.refresh).toHaveBeenCalled();

      const failed = await attempt({ success: false, message: "Sign in failed." });
      expect(failed.text).toContain("Log in failed.");
      expect(failed.text).toContain("Log In");
      expect(failed.submit.props.disabled).toBe(false);
    } finally {
      mocks.cursor.simulate = false;
      vi.unstubAllGlobals();
    }
  });
});
