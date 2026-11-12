import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "./ResetPasswordForm";

const turnstileMock = vi.hoisted(() => ({ latest: null as { onTokenChange: (token: string) => void; action: string; resetKey?: number } | null }));

vi.mock("./TurnstileWidget", () => ({
  TurnstileWidget: (props: { onTokenChange: (token: string) => void; action: string; resetKey?: number }) => {
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
const fetchMock = vi.hoisted(() => ({ fetch: vi.fn() }));
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

function renderForm(isRecovery = false) {
  state.cursor = 0;
  state.idCursor = 0;
  return ResetPasswordForm({ isRecovery });
}

function findElement(node: ReactNode, predicate: (element: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue;
    if (predicate(child)) return child;
    const found = findElement(child.props.children as ReactNode, predicate);
    if (found) return found;
  }
}

function findInput(name: string, isRecovery = false) {
  return findElement(renderForm(isRecovery), (element) => element.props.name === name || element.props.type === "email" || element.props.type === "submit")!;
}

function completeChallenge() {
  renderToStaticMarkup(renderForm());
  if (turnstileMock.latest?.onTokenChange) {
    turnstileMock.latest.onTokenChange("synthetic-token");
  }
}

async function submit(isRecovery = false) {
  const form = findElement(renderForm(isRecovery), (element) => element.type === "form")!;
  await (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn(), currentTarget: { querySelector: () => null } });
}

const genericSuccess = "If an account is associated with this email, a password recovery link has been dispatched.";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
});
afterEach(() => {
  state.active = false;
  state.values = [];
  turnstileMock.latest = null;
  fetchMock.fetch.mockClear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ResetPasswordForm Turnstile challenge (request)", () => {
  it("renders one shared recovery challenge", () => {
    const html = renderToStaticMarkup(<ResetPasswordForm />);
    expect(html).toContain("Complete security verification");
    expect(turnstileMock.latest?.action).toBe("recovery");
  });

  it("includes turnstileToken in the fetch body when challenge is complete", async () => {
    state.active = true;
    fetchMock.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, message: genericSuccess }) });
    vi.stubGlobal("fetch", fetchMock.fetch);
    
    // Fill email
    (findInput("email").props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "renter@example.com" } });
    
    // Trigger token change
    completeChallenge();
    
    // Submit
    await submit();
    
    expect(fetchMock.fetch).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.fetch.mock.calls[0][1].body);
    expect(body).toEqual({ email: "renter@example.com", turnstileToken: "synthetic-token" });
  });

  it("omits turnstileToken from the fetch body when challenge is not complete", async () => {
    state.active = true;
    fetchMock.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, message: genericSuccess }) });
    vi.stubGlobal("fetch", fetchMock.fetch);
    
    // Fill email
    (findInput("email").props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "renter@example.com" } });
    
    // Do NOT trigger token change
    await submit();
    
    expect(fetchMock.fetch).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.fetch.mock.calls[0][1].body);
    expect(body).toEqual({ email: "renter@example.com" });
  });

  it("resets the widget after a failed request", async () => {
    state.active = true;
    fetchMock.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ success: false, error: { message: "Too many requests. Try again later." } }) });
    vi.stubGlobal("fetch", fetchMock.fetch);
    
    (findInput("email").props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "renter@example.com" } });
    completeChallenge();
    
    await submit();
    
    const widget = turnstileMock.latest;
    expect(widget).not.toBeNull();
    if (widget) widget.onTokenChange("synthetic-token-2");
    
    await submit();
    
    expect(fetchMock.fetch).toHaveBeenCalledTimes(2);
    const body = JSON.parse(fetchMock.fetch.mock.calls[1][1].body);
    expect(body).toEqual({ email: "renter@example.com", turnstileToken: "synthetic-token-2" });
  });
});