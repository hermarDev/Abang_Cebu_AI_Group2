import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SupportCenterClient } from "./SupportCenterClient";
import { SUPPORT_CATEGORIES } from "@/lib/support/constants";

// Mock TurnstileWidget so it renders predictably in server markup
vi.mock("@/components/auth/TurnstileWidget", () => ({
  TurnstileWidget: ({ action }: { action: string }) => (
    <div data-testid="turnstile-widget" data-action={action}>
      Turnstile Security Verification
    </div>
  ),
}));

describe("SupportCenterClient", () => {
  it("renders guest guidance card with sign-in link when unauthenticated", () => {
    const html = renderToStaticMarkup(
      <SupportCenterClient
        authenticated={false}
        backHref="/"
        backLabel="Back to map"
      />
    );

    expect(html).toContain("Track your requests");
    expect(html).toContain('href="/login?next=%2Fsupport"');
    expect(html).toContain("Sign in to track requests");
    expect(html).not.toContain("Your requests");
  });

  it("renders request history section when authenticated", () => {
    const html = renderToStaticMarkup(
      <SupportCenterClient
        authenticated={true}
        userId="user-renter-123"
        initialName="Alex Rivera"
        initialEmail="alex@example.com"
        userRole="renter"
        backHref="/"
        backLabel="Back to map"
      />
    );

    expect(html).toContain("Your support requests");
    expect(html).not.toContain("Sign in to track requests");
  });

  it("strictly uses neutral placeholders and never uses Juan dela Cruz", () => {
    const html = renderToStaticMarkup(
      <SupportCenterClient
        authenticated={false}
        backHref="/"
        backLabel="Back to map"
      />
    );

    expect(html).toContain('placeholder="Your full name"');
    expect(html).toContain('placeholder="you@example.com"');
    expect(html).toContain('placeholder="Brief summary of your issue"');
    expect(html).toContain('placeholder="Describe what happened and how we can help..."');
    expect(html).toContain('placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000 (optional)"');

    // Anti-pattern regression check
    expect(html).not.toContain("Juan dela Cruz");
    expect(html).not.toContain("juan@example.com");
  });

  it("renders all form labels, inputs, and category options from SUPPORT_CATEGORIES", () => {
    const html = renderToStaticMarkup(
      <SupportCenterClient
        authenticated={false}
        backHref="/"
        backLabel="Back to map"
      />
    );

    expect(html).toContain("Full name");
    expect(html).toContain("Email address");
    expect(html).toContain("Category");
    expect(html).toContain("Subject");
    expect(html).toContain("Related Listing ID");
    expect(html).toContain("Description");
    expect(html).toContain("Attachments");

    // All categories present
    for (const cat of SUPPORT_CATEGORIES) {
      expect(html).toContain(cat.label.replace(/&/g, "&amp;"));
    }
  });

  it("renders hidden honeypot anti-spam input", () => {
    const html = renderToStaticMarkup(
      <SupportCenterClient
        authenticated={false}
        backHref="/"
        backLabel="Back to map"
      />
    );

    expect(html).toContain('name="website"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("sr-only");
  });

  it("renders file attachment input with allowed file formats and size constraints", () => {
    const html = renderToStaticMarkup(
      <SupportCenterClient
        authenticated={false}
        backHref="/"
        backLabel="Back to map"
      />
    );

    expect(html).toContain('accept="image/jpeg,image/png,image/webp,application/pdf"');
    expect(html).toContain("JPG, PNG, WebP, PDF");
    expect(html).toContain("Add attachment");
  });

  it("renders TurnstileWidget with support action", () => {
    const html = renderToStaticMarkup(
      <SupportCenterClient
        authenticated={false}
        backHref="/"
        backLabel="Back to map"
        turnstileRequired={true}
      />
    );

    expect(html).toContain('data-testid="turnstile-widget"');
    expect(html).toContain('data-action="support"');
  });

  it("renders description character counter with minimum 20 requirement", () => {
    const html = renderToStaticMarkup(
      <SupportCenterClient
        authenticated={false}
        backHref="/"
        backLabel="Back to map"
      />
    );

    expect(html).toContain("0 / 3,000 characters (min. 20)");
  });

  it("renders role-aware back navigation and links to Help Center", () => {
    const adminHtml = renderToStaticMarkup(
      <SupportCenterClient
        authenticated={true}
        userId="admin-1"
        userRole="admin"
        backHref="/admin/dashboard"
        backLabel="Back to admin workspace"
      />
    );

    expect(adminHtml).toContain('href="/admin/dashboard"');
    expect(adminHtml).toContain("Back to admin workspace");
    expect(adminHtml).toContain('href="/help"');
    expect(adminHtml).toContain("Help Center");
  });
});
