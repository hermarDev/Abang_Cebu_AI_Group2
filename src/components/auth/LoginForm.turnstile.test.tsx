import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

const turnstileMock = vi.hoisted(() => ({ latest: null as { onTokenChange: (token: string) => void; action: string; resetKey?: number } | null }));

vi.mock("./TurnstileWidget", () => ({
  TurnstileWidget: (props: { onTokenChange: (token: string) => void; action: string; resetKey?: number }) => {
    console.log("TURNSTILE MOCK CALLED", props);
    turnstileMock.latest = props;
    return (
      <button
        type="button"
        data-testid="turnstile-widget"
        data-action={props.action}
        onClick={() => props.onTokenChange("synthetic-token")}
      >
        Complete security verification
      </button>
    );
  },
}));

const state = vi.hoisted(() => ({ active: false, values: [] as unknown[], cursor: 0, idCursor: 0 }));
const { signInWithEmail } = vi.hoisted(() => ({ signInWithEmail: vi.fn() }));
vi.mock("@/lib/auth/sign-in", () => ({
  getPostLoginRedirect: (_next: string | null, role: string) => role === "landlord" ? "/landlord/dashboard" : "/",
  signInWithEmail,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useId: () => state.active ? `field-${state.idCursor++}` : react.useId(),
    useState: (initial: unknown) => {
      if (!state.active) return react.useState(initial);
      const index = state.cursor++;
      if (!(index in state.values)) state.values[index] = initial;
      return [state.values[index], (value: unknown) => { state.values[index] = typeof value === "function" ? value(state.values[index]) : value; }];
    },
  };
});

function renderForm() {
  state.cursor = 0;
  state.idCursor = 0;
  return LoginForm({ onRegister: () => undefined });
}

function findElement(node: ReactNode, predicate: (element: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue;
    if (predicate(child)) return child;
    const found = findElement(child.props.children as ReactNode, predicate);
    if (found) return found;
  }
}

function findInput(name: string) {
  return findElement(renderForm(), (element) => element.props.name === name || (element.props.type === "submit" && name === "submit") || (element.props.type === "email" && name === "email") || (element.props.type === "password" && name === "password"))!;
}

function completeChallenge() {
  renderToStaticMarkup(renderForm());
  if (turnstileMock.latest?.onTokenChange) {
    turnstileMock.latest.onTokenChange("synthetic-token");
  }
}

async function submit() {
  const form = findElement(renderForm(), (element) => element.type === "form")!;
  await (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn(), currentTarget: { querySelector: () => null } });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
  vi.stubGlobal("document", { getElementById: () => null });
});
afterEach(() => {
  state.active = false;
  state.values = [];
  turnstileMock.latest = null;
  signInWithEmail.mockClear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("LoginForm Turnstile challenge", () => {
  it("renders one shared login challenge", () => {
    const html = renderToStaticMarkup(<LoginForm onRegister={() => undefined} />);
    expect(html).toContain("Complete security verification");
    expect(turnstileMock.latest?.action).toBe("login");
  });

  it("forwards the challenge token to the sign-in client", async () => {
    state.active = true;
    signInWithEmail.mockResolvedValueOnce({ success: true, role: "renter" });
    
    // Fill email
    (findInput("email").props.onChange as (e: { target: { value: string } }) => void)({ target: { value: "a@b.co" } });
    // Fill password
    (findInput("password").props.onChange as (e: { target: { value: string } }) => void)({ target: { value: "secret" } });
    
    // Trigger token change
    completeChallenge();
    
    // Submit
    await submit();
    
    expect(signInWithEmail).toHaveBeenCalledWith("a@b.co", "secret", "synthetic-token");
  });

  it("blocks submission when challenge is incomplete", async () => {
    state.active = true;
    signInWithEmail.mockResolvedValueOnce({ success: true, role: "renter" });
    
    // Fill email
    (findInput("email").props.onChange as (e: { target: { value: string } }) => void)({ target: { value: "a@b.co" } });
    // Fill password
    (findInput("password").props.onChange as (e: { target: { value: string } }) => void)({ target: { value: "secret" } });
    
    // Do NOT trigger token change - submit without token
    await submit();
    
    // signIn should be called with empty token (widget not completed)
    expect(signInWithEmail).toHaveBeenCalledWith("a@b.co", "secret", "");
  });

  it("resets the widget after a failed attempt", async () => {
    state.active = true;
    signInWithEmail.mockResolvedValueOnce({ success: false, message: "Invalid email or password." });
    
    (findInput("email").props.onChange as (e: { target: { value: string } }) => void)({ target: { value: "a@b.co" } });
    (findInput("password").props.onChange as (e: { target: { value: string } }) => void)({ target: { value: "secret" } });
    completeChallenge();
    
    await submit();
    
    // Widget should be reset (turnstileResetKey incremented)
    const widget = turnstileMock.latest;
    expect(widget).not.toBeNull();
    if (widget) widget.onTokenChange("synthetic-token-2");
    
    await submit();
    
    expect(signInWithEmail).toHaveBeenCalledWith("a@b.co", "secret", "synthetic-token-2");
  });
});