import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./RegisterForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const state = vi.hoisted(() => ({ active: false, values: [] as unknown[], cursor: 0, idCursor: 0 }));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useId: () => state.active ? `field-${state.idCursor++}` : react.useId(),
    useMemo: (calculate: () => unknown, deps: unknown[]) => state.active ? calculate() : react.useMemo(calculate, deps),
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
  return findElement(renderForm(), (el) => el.props.name === name)!;
}

function changeInput(name: string, value: string) {
  (findInput(name).props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
}

function fillValidForm() {
  changeInput("fullName", "Juan dela Cruz");
  changeInput("email", "juan@example.com");
  changeInput("password", "Strongpass1!");
}

afterEach(() => {
  state.active = false;
  state.values = [];
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});



describe("RegisterForm", () => {
  it("updates the password checklist using the registration policy", () => {
    state.active = true;
    let html = renderToStaticMarkup(renderForm());
    expect(html).toContain("Password requirements");
    expect(html).toContain("0 of 4 types met (3 required)");
    changeInput("password", "abcdefghA1");
    html = renderToStaticMarkup(renderForm());
    expect(html).toContain("3 of 4 types met (3 required)");
    expect(html).toContain("Requirements met");
    expect(html).not.toContain("Strength:");
    changeInput("password", "abcdefghA ");
    html = renderToStaticMarkup(renderForm());
    expect(html).toContain("2 of 4 types met (3 required)");
    expect(html).not.toContain("Requirements met");
  });

  it("shows registration intent descriptions and canonical Log In labels", () => {
    const html = renderToStaticMarkup(<RegisterForm onLogin={() => {}} />);
    expect(html).toContain('placeholder="Enter your full name"');
    expect(html).toContain('placeholder="Enter your email address"');
    expect(html).toContain('placeholder="Create a password"');
    expect(html).toContain("Find rentals");
    expect(html).toContain("List properties");
    expect(html).not.toContain("Already have an account?");
    expect(html).not.toContain("Return to Login");
    expect(html).not.toContain("Sign In");
    expect(html).not.toContain("Create an Account");
    expect(html).not.toContain("shadow-md");
  });

  it("associates client validation errors inline without losing entered values", async () => {
    state.active = true;
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    changeInput("fullName", "J");
    changeInput("email", "bad-email");
    changeInput("password", "short");
    await submit();

    expect(findElement(renderForm(), (el) => el.type === "form")!.props.noValidate).toBe(true);
    const html = renderToStaticMarkup(renderForm());
    for (const name of ["fullName", "email", "password"]) {
      const input = findInput(name);
      expect(input.props["aria-invalid"]).toBe(true);
      expect(input.props["aria-describedby"]).toContain(`${input.props.id}-error`);
      expect(html).toContain(`id="${input.props.id}-error"`);
    }
    expect(findInput("fullName").props.value).toBe("J");
    expect(findInput("email").props.value).toBe("bad-email");
    expect(findInput("password").props.value).toBe("short");
    expect(request).not.toHaveBeenCalled();
  });

  it("maps keyed server validation details to inline field errors and keeps a form error", async () => {
    state.active = true;
    fillValidForm();
    const request = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: {
        message: "The submitted registration data is invalid.",
        details: { email: "Enter a valid email address.", phoneNumber: "Enter a valid Philippine mobile number." },
      } }),
    });
    vi.stubGlobal("fetch", request);
    await submit();

    const email = findInput("email");
    expect(email.props["aria-describedby"]).toContain(`${email.props.id}-error`);
    expect(findElement(renderForm(), (el) => el.props.name === "phoneNumber")).toBeUndefined();
    const html = renderToStaticMarkup(renderForm());
    expect(html).toContain("The submitted registration data is invalid.");
    expect(html).not.toContain("Philippine Mobile Number");
    expect(html).not.toContain("Enter a valid Philippine mobile number.");
    expect(findInput("fullName").props.value).toBe("Juan dela Cruz");
    expect(findInput("email").props.value).toBe("juan@example.com");
  });

  it("keeps optional phone blank and sends the password exactly as entered", async () => {
    state.active = true;
    fillValidForm();
    changeInput("password", " Strongpass1! ");
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", request);
    await submit();
    expect(request).toHaveBeenCalledOnce();
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({
      fullName: "Juan dela Cruz",
      email: "juan@example.com",
      password: " Strongpass1! ",
      role: "renter",
    });
    expect(JSON.parse(request.mock.calls[0][1].body)).not.toHaveProperty("phoneNumber");
  });

  it("keeps signup to name, email, account type and password", () => {
    const html = renderToStaticMarkup(<RegisterForm />);
    expect(html).toContain('autoComplete="name"');
    expect(html).toContain('autoComplete="email"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).not.toContain('type="tel"');
    expect(html).not.toContain("Philippine Mobile Number");
  });

  it("routes standalone signup's return action to login", () => {
    const push = vi.fn();
    state.active = true;
    const tree = RegisterForm();
    const back = findElement(tree, (element) => element.props.children === "Return to Login");
    expect(back?.props.onClick).toBeTypeOf("function");
    (back?.props.onClick as () => void)();
    expect(push).not.toHaveBeenCalled();
  });


  it("renders an accessible icon control for the signup password", () => {
    const html = renderToStaticMarkup(<RegisterForm onLogin={() => {}} />);
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain('class="lucide lucide-eye');
    expect(html).toContain("min-h-11 min-w-11");
    expect(html).not.toContain(">Show</button>");
    expect(html).not.toContain(">Hide</button>");
  });

  it("describes the server password length and character-class policy", () => {
    const html = renderToStaticMarkup(<RegisterForm />);
    expect(html).toContain('minLength="8"');
    expect(html).toContain('maxLength="72"');
    expect(html).toContain("8–72 characters");
    expect(html).toContain("0 of 4 types met (3 required)");
    expect(html).toContain('aria-describedby=');
  });
  it("does not render a public signup phone field", () => {
    const html = renderToStaticMarkup(<RegisterForm />);
    expect(html).not.toContain('type="tel"');
    expect(html).not.toContain("Philippine Mobile Number");
  });

  it("uses a radiogroup for account type instead of tabs", () => {
    const html = renderToStaticMarkup(<RegisterForm onLogin={() => {}} />);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('role="radio"');
    expect(html).toContain('aria-label="Account type"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("Find rentals");
    expect(html).toContain("List properties");
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('role="tab"');
  });
});

async function submitForm() {
  const form = findElement(renderForm(), (el) => el.type === "form")!;
  const focus = vi.fn();
  const querySelector = vi.fn(() => ({ focus }));
  await (form.props.onSubmit as (event: { preventDefault: () => void; currentTarget: { querySelector: typeof querySelector } }) => Promise<void>)({ preventDefault: vi.fn(), currentTarget: { querySelector } });
  if (querySelector.mock.calls.length) expect(focus).toHaveBeenCalledOnce();
}
async function submit(valid = false) {
  if (valid) fillValidForm();
  await submitForm();
}

describe("production submission", () => {
  it("sends a request without verification", async () => {
    state.active = true;
    vi.stubEnv("NODE_ENV", "production");
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", request);
    await submit(true);
    expect(request).toHaveBeenCalledOnce();
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ fullName: "Juan dela Cruz", email: "juan@example.com", password: "Strongpass1!", role: "renter" });
  });
  it.each(["server", "network", "invalid JSON"])("allows retry after %s failure", async (failure) => {
    state.active = true;
    vi.stubEnv("NODE_ENV", "production");
    const request = failure === "network" ? vi.fn().mockRejectedValue(new Error("offline"))
      : vi.fn().mockResolvedValue({ ok: false, json: failure === "invalid JSON"
        ? async () => { throw new Error("invalid JSON"); }
        : async () => ({ success: false, error: { message: "Try again." } }) });
    vi.stubGlobal("fetch", request);
    await submit(true);
    expect(findElement(renderForm(), (el) => el.props.type === "submit")!.props.disabled).toBe(false);
    await submit(true);
    expect(request).toHaveBeenCalledTimes(2);
  });

});
