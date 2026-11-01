import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { FinderNavigation } from "./FinderNavigation";

vi.mock("@/components/ui/Modal", () => ({ Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

it("opens account settings instead of login when authenticated", () => {
  const html = renderToStaticMarkup(<FinderNavigation open authenticated userRole="renter" onClose={() => {}} preference="system" resolvedTheme="light" onPreferenceChange={() => {}} onAccount={() => {}} onHelp={() => {}} />);
  expect(html).toContain('href="/account"');
  expect(html).toContain("Account settings");
  expect(html).not.toContain("Log in");
  expect(html).toContain('aria-current="page"');
  expect(html).toContain("lucide-search");
  expect(html).toContain("lucide-message-circle");
});

it("shows landlord dashboard and listing links for landlord accounts", () => {
  const html = renderToStaticMarkup(<FinderNavigation open authenticated userRole="landlord" onClose={() => {}} preference="system" resolvedTheme="light" onPreferenceChange={() => {}} onAccount={() => {}} onHelp={() => {}} />);
  expect(html).toContain('href="/account"');
  expect(html).toContain('href="/landlord/dashboard"');
  expect(html).toContain('href="/list-property"');
  expect(html).toContain("lucide-house-plus");
});
