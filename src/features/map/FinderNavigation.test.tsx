import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { FinderNavigation } from "./FinderNavigation";

vi.mock("@/components/ui/Modal", () => ({ Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

it("opens account settings instead of login when authenticated", () => {
  const html = renderToStaticMarkup(<FinderNavigation open authenticated onClose={() => {}} preference="system" resolvedTheme="light" onPreferenceChange={() => {}} onAccount={() => {}} onHelp={() => {}} />);
  expect(html).toContain('href="/account"');
  expect(html).toContain("Account settings");
  expect(html).not.toContain("Log in");
  expect(html).toContain('aria-current="page"');
  expect(html).toContain("lucide-search");
  expect(html).toContain("lucide-house-plus");
  expect(html).toContain("lucide-message-circle");
});
