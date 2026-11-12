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

it("links authenticated renters to messages with an unread badge", () => {
  const html = renderToStaticMarkup(<FinderNavigation open authenticated userRole="renter" userId="renter-1" unreadMessageCount={120} onClose={() => {}} preference="system" resolvedTheme="light" onPreferenceChange={() => {}} onAccount={() => {}} onHelp={() => {}} />);
  expect(html).toContain('href="/messages"');
  expect(html).toContain("Messages");
  expect(html).toContain('aria-label="120 unread messages"');
  expect(html).toContain("99+");
});

it("hides the unread badge at zero and the messages link from guests and landlords", () => {
  const renter = renderToStaticMarkup(<FinderNavigation open authenticated userRole="renter" userId="renter-1" unreadMessageCount={0} onClose={() => {}} preference="system" resolvedTheme="light" onPreferenceChange={() => {}} onAccount={() => {}} onHelp={() => {}} />);
  expect(renter).toContain('href="/messages"');
  expect(renter).not.toContain("unread messages");
  for (const role of ["landlord", null] as const) {
    const html = renderToStaticMarkup(<FinderNavigation open authenticated={role !== null} userRole={role} onClose={() => {}} preference="system" resolvedTheme="light" onPreferenceChange={() => {}} onAccount={() => {}} onHelp={() => {}} />);
    expect(html).not.toContain('href="/messages"');
  }
});

it("renders structured semantic section headers, MessageSquare icon, and sidebar AccountMenu", () => {
  const html = renderToStaticMarkup(
    <FinderNavigation
      open
      authenticated
      userRole="renter"
      userId="renter-1"
      displayName="Maria Santos"
      avatarUrl="https://example.com/avatar.jpg"
      onClose={() => {}}
      preference="system"
      resolvedTheme="light"
      onPreferenceChange={() => {}}
      onAccount={() => {}}
      onHelp={() => {}}
    />
  );
  expect(html).toContain("Rentals");
  expect(html).toContain("Communication");
  expect(html).toContain("Assistance");
  expect(html).toContain("Support");
  expect(html).not.toContain('aria-label="Account"');
  expect(html.match(/href="\/account"/g)).toHaveLength(1);
  expect(html).toContain("lucide-message-square");
  expect(html).toContain("Maria Santos");
  expect(html).toContain("Renter");
  expect(html).toContain('src="https://example.com/avatar.jpg"');
  expect(html).toContain("Account settings");
  expect(html).toContain('href="/auth/logout"');
  expect(html).toContain("Log out");
});

it("shows workspace section header for landlord and admin", () => {
  const landlordHtml = renderToStaticMarkup(
    <FinderNavigation
      open
      authenticated
      userRole="landlord"
      onClose={() => {}}
      preference="system"
      resolvedTheme="light"
      onPreferenceChange={() => {}}
      onAccount={() => {}}
      onHelp={() => {}}
    />
  );
  expect(landlordHtml).toContain("Workspace");
  expect(landlordHtml).toContain("Landlord workspace");

  const adminHtml = renderToStaticMarkup(
    <FinderNavigation
      open
      authenticated
      userRole="admin"
      onClose={() => {}}
      preference="system"
      resolvedTheme="light"
      onPreferenceChange={() => {}}
      onAccount={() => {}}
      onHelp={() => {}}
    />
  );
  expect(adminHtml).toContain("Workspace");
  expect(adminHtml).toContain("Admin workspace");
});

it("renders notifications button with unread count for authenticated users", () => {
  const html = renderToStaticMarkup(
    <FinderNavigation
      open
      authenticated
      userRole="renter"
      userId="renter-1"
      unreadNotificationCount={5}
      onClose={() => {}}
      preference="system"
      resolvedTheme="light"
      onPreferenceChange={() => {}}
      onAccount={() => {}}
      onHelp={() => {}}
      onNotifications={() => {}}
    />
  );
  expect(html).toContain("Notifications");
  expect(html).toContain("lucide-bell");
  expect(html).toContain('aria-label="5 unread notifications"');
});
