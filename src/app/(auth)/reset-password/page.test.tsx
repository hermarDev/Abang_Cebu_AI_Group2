import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "./page";

// SSR cannot render Radix portals; test route-to-form data flow inline.
vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
}));

const { cookieGet } = vi.hoisted(() => ({ cookieGet: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

beforeEach(() => cookieGet.mockReset());

describe("ResetPasswordPage", () => {
  it("shows the new-password form only after callback marks a recovery session", async () => {
    cookieGet.mockReturnValue({ value: "1" });

    const page = await ResetPasswordPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Choose a new password");
    expect(html).toContain('name="newPassword"');
    expect(html).toContain('name="confirmPassword"');
  });

  it("shows the email request form without the recovery marker", async () => {
    cookieGet.mockReturnValue(undefined);

    const page = await ResetPasswordPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Enter your email to receive recovery instructions");
    expect(html).not.toContain('name="newPassword"');
  });
});
