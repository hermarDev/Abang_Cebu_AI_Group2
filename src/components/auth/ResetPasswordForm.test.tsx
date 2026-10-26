import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { TurnstileWidget } from "./TurnstileWidget";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

const state = vi.hoisted(() => ({ active: false, values: [] as unknown[], cursor: 0 }));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useId: () => state.active ? `field-${state.cursor}` : react.useId(),
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

afterEach(() => {
  state.active = false;
  state.values = [];
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));

vi.mock("./TurnstileWidget", () => ({ TurnstileWidget: () => null }));

describe("ResetPasswordForm", () => {
  it("blocks mismatched recovery passwords, focuses confirmation and links its error", async () => {
    state.active = true;
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    for (const [name, value] of [["newPassword", "StrongPass1!"], ["confirmPassword", "DifferentPass1!"]]) {
      const input = findElement(renderForm(true), (element) => element.props.name === name)!;
      (input.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
    }
    const focus = vi.fn();
    const querySelector = vi.fn(() => ({ focus }));
    const form = findElement(renderForm(true), (element) => element.type === "form")!;
    await (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn(), currentTarget: { querySelector } });
    expect(request).not.toHaveBeenCalled();
    expect(querySelector).toHaveBeenCalledWith('[name="confirmPassword"]');
    expect(focus).toHaveBeenCalledOnce();
    const confirmation = findElement(renderForm(true), (element) => element.props.name === "confirmPassword")!;
    expect(confirmation.props["aria-invalid"]).toBe(true);
    const html = renderToStaticMarkup(renderForm(true));
    expect(html).toContain("Passwords do not match.");
    expect(html).toContain(`id="${confirmation.props["aria-describedby"]}"`);
  });
  it("shows a recovery icon above the recovery form", () => {
    const html = renderToStaticMarkup(<ResetPasswordForm />);

    expect(html).toContain("lucide-key-round");
  });

  it("renders password and confirmation fields for a verified recovery session", () => {
    const html = renderToStaticMarkup(<ResetPasswordForm isRecovery />);

    expect(html).toContain("Choose a new password");
    expect(html).toContain("Use 8–72 characters and include at least three");
    expect(html).toContain('name="newPassword"');
    expect(html).toContain('name="confirmPassword"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain('maxLength="72"');
    expect(html).not.toContain("Email Address");
  });

  it("keeps the email request form when no recovery session exists", () => {
    const html = renderToStaticMarkup(<ResetPasswordForm isRecovery={false} />);

    expect(html).toContain("Enter your email to receive recovery instructions");
    expect(html).toContain("Email Address");
    expect(html).not.toContain('name="newPassword"');
    expect(html).not.toContain("Remember your password? Sign In");
    expect(html).not.toContain("Back to AbangCebu");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Back to Log In");
    expect(html).toContain("Reset password");
    expect(html).toContain("Send reset link");
  });

  it("replaces the request form with neutral confirmation after a successful request", async () => {
    state.active = true;
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: "Account exists: private@example.com" }),
    });
    vi.stubGlobal("fetch", request);
    const form = findElement(renderForm(), (element) => element.type === "form")!;
    await (form.props.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: vi.fn() });

    const html = renderToStaticMarkup(renderForm());
    expect(request).toHaveBeenCalledWith("/api/auth/reset-password/request", expect.objectContaining({ method: "POST" }));
    expect(html).toContain("Check your email");
    expect(html).toContain('role="status"');
    expect(html).toContain("If an account is associated with this email");
    expect(html).not.toContain("Account exists");
    expect(html).not.toContain("private@example.com");
    expect(html).not.toContain("<form");
    expect(html).not.toContain('type="email"');
    expect(html).not.toContain("Send reset link");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Back to Log In");
    expect(replace).not.toHaveBeenCalled();
  });

  it.each(["rate limit", "network", "invalid response"])("keeps the typed email and retry form after %s failure", async (failure) => {
    state.active = true;
    vi.stubGlobal("fetch", failure === "network"
      ? vi.fn().mockRejectedValue(new Error("offline"))
      : vi.fn().mockResolvedValue({
        ok: false,
        json: failure === "invalid response" ? async () => { throw new Error("invalid JSON"); }
          : async () => ({ success: false, error: { message: "Too many requests. Try again later." } }),
      }));
    const email = findElement(renderForm(), (element) => element.props.type === "email")!;
    (email.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "renter@example.com" } });
    const form = findElement(renderForm(), (element) => element.type === "form")!;
    await (form.props.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: vi.fn() });

    const html = renderToStaticMarkup(renderForm());
    expect(html).toContain('role="alert"');
    expect(html).toContain(failure === "rate limit" ? "Too many requests. Try again later." : "Password recovery is temporarily unavailable. Try again.");
    expect(html).toContain('value="renter@example.com"');
    expect(html).toContain("<form");
    expect(html).not.toContain("Check your email");
    expect(html).not.toContain('disabled=""');
  });

  it("keeps the verified password update redirect flow", async () => {
    state.active = true;
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", request);
    const form = findElement(renderForm(true), (element) => element.type === "form")!;
    await (form.props.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: vi.fn() });

    expect(request).toHaveBeenCalledWith("/api/auth/reset-password/confirm", expect.objectContaining({
      body: JSON.stringify({ newPassword: "", confirmPassword: "" }),
    }));
    expect(replace).toHaveBeenCalledWith("/login?message=password_reset_success");
    expect(refresh).toHaveBeenCalledOnce();
    expect(renderToStaticMarkup(renderForm(true))).not.toContain("Check your email");
  });
});

function verification() {
  return findElement(renderForm(), (el) => el.type === TurnstileWidget)!;
}
async function submit() {
  const form = findElement(renderForm(), (el) => el.type === "form")!;
  await (form.props.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: vi.fn() });
}

describe("recovery request verification", () => {

  it("blocks production submission without verification even through the handler", async () => {
    state.active = true;
    vi.stubEnv("NODE_ENV", "production");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    expect(findElement(renderForm(), (el) => el.props.type === "submit")!.props.disabled).toBe(true);
    await submit();
    expect(request).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(renderForm())).toContain("Complete the security verification");
  });
  it.each(["server", "network", "invalid JSON"])("consumes verification after %s failure and requires a fresh token", async (failure) => {
    state.active = true;
    vi.stubEnv("NODE_ENV", "production");
    const request = failure === "network" ? vi.fn().mockRejectedValue(new Error("offline"))
      : vi.fn().mockResolvedValue({ ok: false, json: failure === "invalid JSON"
        ? async () => { throw new Error("invalid JSON"); }
        : async () => ({ success: false, error: { message: "Try again." } }) });
    vi.stubGlobal("fetch", request);
    const first = verification();
    (first.props.onTokenChange as (token: string) => void)("synthetic-first");
    expect(findElement(renderForm(), (el) => el.props.type === "submit")!.props.disabled).toBe(false);
    await submit();
    expect(JSON.parse(request.mock.calls[0][1].body).turnstileToken).toBe("synthetic-first");
    expect(verification().props.resetKey).toBe(Number(first.props.resetKey) + 1);
    expect(findElement(renderForm(), (el) => el.props.type === "submit")!.props.disabled).toBe(true);
    await submit();
    expect(request).toHaveBeenCalledTimes(1);
    (verification().props.onTokenChange as (token: string) => void)("synthetic-fresh");
    await submit();
    expect(JSON.parse(request.mock.calls[1][1].body).turnstileToken).toBe("synthetic-fresh");
  });
  it("sends production verification and retains the successful email confirmation", async () => {
    state.active = true;
    vi.stubEnv("NODE_ENV", "production");
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, message: "private account details" }) });
    vi.stubGlobal("fetch", request);
    (verification().props.onTokenChange as (token: string) => void)("synthetic-success");
    await submit();
    expect(JSON.parse(request.mock.calls[0][1].body).turnstileToken).toBe("synthetic-success");
    const html = renderToStaticMarkup(renderForm());
    expect(html).toContain("Check your email");
    expect(html).not.toContain("private account details");
    expect(html).not.toContain("<form");
  });

  it("blocks production requests after widget expiry clears a token", async () => {
    state.active = true;
    vi.stubEnv("NODE_ENV", "production");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    (verification().props.onTokenChange as (token: string) => void)("synthetic-expired");
    (verification().props.onTokenChange as (token: string) => void)("");
    await submit();
    expect(request).not.toHaveBeenCalled();
  });
  it("does not gate verified password updates in production or mount verification", async () => {
    state.active = true;
    vi.stubEnv("NODE_ENV", "production");
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", request);
    const tree = renderForm(true);
    expect(findElement(tree, (el) => el.type === TurnstileWidget)).toBeUndefined();
    expect(findElement(tree, (el) => el.props.type === "submit")!.props.disabled).toBe(false);
    const form = findElement(tree, (el) => el.type === "form")!;
    await (form.props.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: vi.fn() });
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ newPassword: "", confirmPassword: "" });
    expect(replace).toHaveBeenCalledWith("/login?message=password_reset_success");
  });
});
