import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));

describe("ResetPasswordForm", () => {
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
    expect(html).not.toContain('href="/login"');
  });
});
