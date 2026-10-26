import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";
import { TurnstileWidget } from "./TurnstileWidget";
import { signInWithEmail } from "@/lib/auth/sign-in";

const state = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useId: () => "field",
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => { state.values[index] = typeof value === "function" ? value(state.values[index]) : value; }];
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/sign-in", () => ({ signInWithEmail: vi.fn(), getPostLoginRedirect: () => "/" }));
function render() { state.cursor = 0; return LoginForm(); }
function find(node: ReactNode, predicate: (el: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue;
    if (predicate(child)) return child;
    const nested = find(child.props.children as ReactNode, predicate);
    if (nested) return nested;
  }
}
function element(predicate: Parameters<typeof find>[1]) { return find(render(), predicate)!; }
async function submit() { await (element(el => el.type === "form").props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault() {} }); }
function token(value: string) { (element(el => el.type === TurnstileWidget).props.onTokenChange as (value: string) => void)(value); }
beforeEach(() => {
  state.values = []; state.cursor = 0;
  vi.stubEnv("NODE_ENV", "production");
  vi.mocked(signInWithEmail).mockReset().mockResolvedValue({ success: false, message: "Invalid email or password." });
  for (const [type, value] of [["email", "test@example.com"], ["password", "Test-password-1!"]]) {
    (element(el => el.props.type === type && typeof el.props.onChange === "function").props.onChange as (e: unknown) => void)({ target: { value } });
  }
});
afterEach(() => vi.unstubAllEnvs());
it("blocks login until verification and resets a consumed token after a failed attempt", async () => {
  expect(element(el => el.type === TurnstileWidget)).toBeDefined();
  await submit();
  expect(signInWithEmail).not.toHaveBeenCalled();
  token("verified-token");
  await submit();
  expect(signInWithEmail).toHaveBeenCalledWith("test@example.com", "Test-password-1!", "verified-token");
  expect(element(el => el.type === TurnstileWidget).props.resetKey).toBe(1);
  await submit();
  expect(signInWithEmail).toHaveBeenCalledTimes(1);
});
it("blocks an expired token and clears verification after network failure", async () => {
  token("expired-token"); token("");
  await submit();
  expect(signInWithEmail).not.toHaveBeenCalled();
  token("fresh-token");
  vi.mocked(signInWithEmail).mockRejectedValueOnce(new Error("Network"));
  await submit();
  expect(element(el => el.type === TurnstileWidget).props.resetKey).toBe(1);
  await submit();
  expect(signInWithEmail).toHaveBeenCalledTimes(1);
});
