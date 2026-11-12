import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./RegisterForm";

const state = vi.hoisted(() => ({ active: false, values: [] as unknown[], cursor: 0, idCursor: 0 }));
const turnstileMock = vi.hoisted(() => ({ latest: null as null | { onTokenChange: (token: string) => void; action: string } }));

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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

function renderForm() {
  state.cursor = 0;
  state.idCursor = 0;
  return RegisterForm();
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
  return findElement(renderForm(), (element) => element.props.name === name)!;
}

function fillValidForm() {
  for (const [name, value] of [["fullName", "Mika Santos"], ["email", "mika@example.com"], ["password", "Strongpass1!"]]) {
    (findInput(name).props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
  }
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

afterEach(() => {
  state.active = false;
  state.values = [];
  turnstileMock.latest = null;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("RegisterForm Turnstile challenge", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks submission until the challenge is complete", async () => {
    state.active = true;
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    fillValidForm();
    await submit();
    expect(request).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(renderForm())).toContain("Complete the security verification before registering");
  });

  it.each(["renter", "landlord"] as const)("forwards the challenge token for %s registration", async (role) => {
    state.active = true;
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", request);
    fillValidForm();
    if (role === "landlord") {
      const roleGroup = findElement(renderForm(), (element) => element.props["aria-label"] === "Account type")!;
      (roleGroup.props.onValueChange as (value: string) => void)("landlord");
    }
    completeChallenge();
    console.log("DEBUG", state.values, turnstileMock.latest);
    expect(state.values).toContain("synthetic-token");
    await submit();
    expect(request).toHaveBeenCalledOnce();
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ role, turnstileToken: "synthetic-token" });
  });

  it("clears and resets the challenge after every submitted attempt", async () => {
    state.active = true;
    const request = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ success: false, error: { message: "Try again." } }) });
    vi.stubGlobal("fetch", request);
    fillValidForm();
    completeChallenge();
    await submit();
    expect(state.values.some(value => value === "synthetic-token")).toBe(false);
  });
});
