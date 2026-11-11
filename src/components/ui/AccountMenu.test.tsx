import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountMenu } from "./AccountMenu";

describe("AccountMenu", () => {
  it("renders header variant with trigger, identity row, settings and logout links", () => {
    const html = renderToStaticMarkup(
      <AccountMenu
        displayName="Ada Lovelace"
        avatarUrl="https://example.com/ada.jpg"
        role="Admin"
        variant="header"
      />
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-label="Account options for Ada Lovelace"');
    expect(html).toContain("Account");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Admin");
    expect(html).toContain("min-w-56");
    expect(html).toContain("dark:bg-primary/10");
    expect(html).toContain("dark:text-primary");
    expect(html).toContain('src="https://example.com/ada.jpg"');
    expect(html).toContain('href="/account"');
    expect(html).toContain("Account settings");
    expect(html).toContain('href="/auth/logout"');
    expect(html).toContain("Log out");
    expect(html).toContain("text-destructive");
    expect(html).toContain("hover:bg-destructive/10");
    expect(html).toContain("size-9");
    expect(html).not.toContain("size-8");
  });

  it("renders sidebar variant with compact profile row and upward popover", () => {
    const html = renderToStaticMarkup(
      <AccountMenu
        displayName="Renter User"
        role="renter"
        variant="sidebar"
      />
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-label="Account options for Renter User"');
    expect(html).toContain("Renter User");
    expect(html).toContain("Renter");
    expect(html).toContain("dark:bg-primary/10");
    expect(html).toContain("dark:text-primary");
    expect(html).toContain("bottom-[calc(100%+0.5rem)]");
    expect(html).toContain('href="/account"');
    expect(html).toContain("Account settings");
    expect(html).toContain('href="/auth/logout"');
    expect(html).toContain("Log out");
  });

  it("renders fallback icon when no avatarUrl is provided", () => {
    const html = renderToStaticMarkup(
      <AccountMenu variant="header" />
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-label="Account options"');
    expect(html).toContain("lucide-user-round");
    expect(html).toContain("Account");
  });

  it("always renders the profile header with fallbacks and a separator before logout", () => {
    const html = renderToStaticMarkup(<AccountMenu variant="header" />);
    expect(html).toContain("Renter");
    expect(html).toContain("size-9");
    expect(html.match(/role="separator"/g)).toHaveLength(2);
    expect(html).toContain("text-destructive");
    expect(html).toContain("lucide-log-out");
  });
});
