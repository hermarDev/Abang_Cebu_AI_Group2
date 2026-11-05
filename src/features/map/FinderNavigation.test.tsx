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

it("shows the workspace for landlord accounts without linking unavailable submission", () => {
  const html = renderToStaticMarkup(<FinderNavigation open authenticated userRole="landlord" onClose={() => {}} preference="system" resolvedTheme="light" onPreferenceChange={() => {}} onAccount={() => {}} onHelp={() => {}} />);
  expect(html).toContain('href="/account"');
  expect(html).toContain('href="/landlord/dashboard"');
  expect(html).not.toContain('href="/list-property"');
  expect(html).not.toContain("lucide-house-plus");
  expect(html).toContain("lucide-layout-dashboard");
});

it("does not link administrators to the deferred review route", () => {
  const html = renderToStaticMarkup(<FinderNavigation open authenticated userRole="admin" onClose={() => {}} preference="system" resolvedTheme="light" onPreferenceChange={() => {}} onAccount={() => {}} onHelp={() => {}} />);
  expect(html).toContain('href="/account"');
  expect(html).not.toContain('href="/admin/listings"');
});
