import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/reviews" }));
import { AdminWorkspaceLayout } from "./AdminWorkspaceLayout";

const html = renderToStaticMarkup(<AdminWorkspaceLayout title="Listing reviews" subtitle="Sub" displayName="Ada Admin"><p>Body</p></AdminWorkspaceLayout>);

describe("AdminWorkspaceLayout", () => {
  it("renders the grouped desktop sidebar with the active page marked", () => {
    expect(html).toContain('aria-label="Admin navigation"');
    for (const [label, href] of [["Overview", "/admin/dashboard"], ["Listing reviews", "/admin/reviews"], ["Accounts", "/admin/accounts"], ["Reports", "/admin/reports"], ["Audit log", "/admin/audit"], ["Account settings", "/account"]]) {
      expect(html).toMatch(new RegExp(`aria-label="${label}"[^>]*href="${href}"`));
    }
    expect(html).toMatch(/aria-label="Listing reviews" aria-current="page"/);
    expect(html).toContain("Moderation");
  });
  it("renders header controls, theme controls, children, and a mobile bar with 44px targets", () => {
    expect(html).toContain("AbangCebu · Admin");
    expect(html).toContain('href="/auth/logout"');
    expect(html).toContain("Listing reviews</h1>");
    expect(html).toContain("<p>Body</p>");
    expect(html).toContain('aria-label="Admin mobile navigation"');
    expect(html).toContain("lg:hidden");
    expect(html).toContain("min-h-11");
    for (const label of ["Overview", "Reviews", "Accounts", "Reports"]) expect(html).toContain(`aria-label="${label}"`);
    expect(html).toContain('aria-label="More admin options"');
    expect(html).toMatch(/aria-label="[^"]*(light|dark|system|theme)/i);
  });
});
