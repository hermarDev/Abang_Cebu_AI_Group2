import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
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


describe("ResetPasswordForm", () => {
  it("associates weak-password server feedback and requirements with the new password", async () => {
    state.active = true;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ success: false, error: { code: "WEAK_PASSWORD", message: "Choose a stronger password." } }) }));
    for (const name of ["newPassword", "confirmPassword"]) {
      const input = findElement(renderForm(true), (element) => element.props.name === name)!;
      (input.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "weakpassword" } });
    }
    const focus = vi.fn();
    const querySelector = vi.fn(() => ({ focus }));
    const form = findElement(renderForm(true), (element) => element.type === "form")!;
    await (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn(), currentTarget: { querySelector } });
    expect(querySelector).toHaveBeenCalledWith('[name="newPassword"]');
    expect(focus).toHaveBeenCalledOnce();
    const input = findElement(renderForm(true), (element) => element.props.name === "newPassword")!;
    expect(input.props["aria-invalid"]).toBe(true);
    expect(input.props["aria-describedby"]).toContain(`${input.props.id}-policy`);
    expect(input.props["aria-describedby"]).toContain(`${input.props.id}-error`);
    const html = renderToStaticMarkup(renderForm(true));
    expect(html).toContain(`id="${input.props.id}-policy"`);
    expect(html).toContain(`id="${input.props.id}-error"`);
    expect(html).not.toContain("temporarily unavailable");
    expect(input.props.value).toBe("weakpassword");
  });
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
  it("renders a persistent live region for password match feedback", () => {
    state.active = true;
    const tree = renderForm(true);
    const region = findElement(tree, (element) => element.props["data-password-match-status"] === true);
    expect(region?.props.role).toBe("status");
    expect(region?.props.children).toBeFalsy();
  });
  it("shows a recovery icon above the recovery form", () => {
    const html = renderToStaticMarkup(<ResetPasswordForm />);

    expect(html).toContain("lucide-key-round");
  });

  it("renders password and confirmation fields for a verified recovery session", () => {
    const html = renderToStaticMarkup(<ResetPasswordForm isRecovery />);

    expect(html).toContain("Choose a new password");
    expect(html).toContain("Password requirements");
    for (const label of ["8–72 characters", "Uppercase letter", "Lowercase letter", "Number", "Symbol"]) expect(html).toContain(label);
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

async function submit() {
  const form = findElement(renderForm(), (el) => el.type === "form")!;
  await (form.props.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: vi.fn() });
}

describe("production submission", () => {
  it("sends a request without verification", async () => {
    state.active = true;
    vi.stubEnv("NODE_ENV", "production");
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", request);
    const input = findElement(renderForm(), (el) => el.props.type === "email")!;
    (input.props.onChange as (event: unknown) => void)({ target: { value: "renter@example.com" } });
    await submit();
    expect(request).toHaveBeenCalledOnce();
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ email: "renter@example.com" });
  });
  it.each(["server", "network", "invalid JSON"])("allows retry after %s failure", async (failure) => {
    state.active = true;
    vi.stubEnv("NODE_ENV", "production");
    const request = failure === "network" ? vi.fn().mockRejectedValue(new Error("offline"))
      : vi.fn().mockResolvedValue({ ok: false, json: failure === "invalid JSON"
        ? async () => { throw new Error("invalid JSON"); }
        : async () => ({ success: false, error: { message: "Try again." } }) });
    vi.stubGlobal("fetch", request);
    await submit();
    expect(findElement(renderForm(), (el) => el.props.type === "submit")!.props.disabled).toBe(false);
    await submit();
    expect(request).toHaveBeenCalledTimes(2);
  });

});
