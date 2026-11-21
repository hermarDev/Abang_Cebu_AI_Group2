import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), signIn: vi.fn(), state: [] as unknown[], refs: [] as { current: unknown }[], effects: [] as (() => void)[], cursor: { i: 0, refI: 0, simulate: false } }));
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
    useRef: (init: unknown) => {
      if (!mocks.cursor.simulate) return actual.useRef(init);
      const i = mocks.cursor.refI++;
      if (!(i in mocks.refs)) mocks.refs[i] = { current: init };
      return mocks.refs[i];
    },
    useEffect: (effect: () => void) => {
      if (!mocks.cursor.simulate) return actual.useEffect(effect);
      mocks.effects.push(effect);
    },
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
  mocks.cursor.refI = 0;
  mocks.effects.length = 0;
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

  it("uses username autocomplete and disables spellcheck without per-field role=alert", async () => {
    const html = renderToStaticMarkup(<LoginForm />);
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('spellCheck="false"');

    vi.stubGlobal("document", { getElementById: () => null });
    mocks.state.length = 0;
    mocks.refs.length = 0;
    mocks.cursor.simulate = true;
    try {
      await (render().form.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: () => undefined });
      mocks.cursor.i = 0;
      mocks.cursor.refI = 0;
      const errorHtml = renderToStaticMarkup(LoginForm());
      expect(errorHtml).toContain("Enter your email address.");
      expect(errorHtml).toContain("Enter your password.");
      expect(errorHtml).not.toContain('role="alert"');
    } finally {
      mocks.cursor.simulate = false;
      vi.unstubAllGlobals();
    }
  });

  it("clears stale server banner, focuses first invalid input after render, and updates polite error announcement", async () => {
    const emailFocus = vi.fn();
    let renderedErrorHtml = "";
    const getElementById = vi.fn((id: string) => (id === "id" ? { focus: emailFocus } : null));
    vi.stubGlobal("document", { getElementById });
    vi.stubGlobal("window", { location: { search: "" } });
    mocks.state.length = 0;
    mocks.refs.length = 0;
    mocks.signIn.mockResolvedValueOnce({ success: false, message: "Invalid login credentials." });
    mocks.cursor.simulate = true;
    try {
      render();
      mocks.state[1] = "a@b.co";
      mocks.state[2] = "secret";
      await (render().form.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: () => undefined });
      expect(render().text).toContain("Invalid login credentials.");

      // Clear email and re-submit invalidly: stale server banner should clear, focus waits for commit effect, and aria-live polite announces
      mocks.state[1] = "";
      await (render().form.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: () => undefined });
      expect(emailFocus).not.toHaveBeenCalled();

      mocks.cursor.i = 0;
      mocks.cursor.refI = 0;
      mocks.effects.length = 0;
      renderedErrorHtml = renderToStaticMarkup(LoginForm());
      expect(renderedErrorHtml).not.toContain("Invalid login credentials.");
      expect(renderedErrorHtml).toContain('aria-describedby="id-error"');
      expect(renderedErrorHtml).toContain('aria-live="polite"');
      expect(renderedErrorHtml).toContain("Enter your email address.");
      expect(renderedErrorHtml).not.toContain('role="alert"');

      render();
      expect(mocks.effects.length).toBeGreaterThan(0);
      mocks.effects.forEach((effect) => effect());
      expect(emailFocus).toHaveBeenCalledOnce();
    } finally {
      mocks.cursor.simulate = false;
      vi.unstubAllGlobals();
    }
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

      for (const role of ["admin", "verification_officer", "customer_support"]) {
        const staff = await attempt({ success: true, role });
        expect(staff.text).toContain("Signing in · Preparing your workspace…");
      }

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
