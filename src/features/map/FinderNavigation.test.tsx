import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FinderNavigation } from "./FinderNavigation";

vi.mock("@/components/ui/Modal", () => ({ Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const mockNotificationState = vi.hoisted(() => ({
  unreadCount: 0,
  loading: false,
  error: null as string | null,
}));

vi.mock("@/features/notifications/useNotificationCenter", () => ({
  useNotificationCenter: () => mockNotificationState,
}));

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

it.each([
  ["verification_officer", "/verification/dashboard"],
  ["customer_support", "/support-desk/dashboard"],
] as const)("offers %s a workspace link", (role, href) => {
  const html = renderToStaticMarkup(<FinderNavigation open authenticated userRole={role} onClose={() => {}} preference="system" resolvedTheme="light" onPreferenceChange={() => {}} onAccount={() => {}} onHelp={() => {}} />);
  expect(html.includes(`href="${href}"`)).toBe(true);
});

it("links Help Center and Contact support without inline FAQ or mailto", () => {
  const html = renderToStaticMarkup(<FinderNavigation open onClose={() => {}} preference="system" resolvedTheme="light" onPreferenceChange={() => {}} onAccount={() => {}} onHelp={() => {}} />);
  expect(html).toContain('href="/help"');
  expect(html).toContain("Help Center");
  expect(html).toContain('href="/support"');
  expect(html).toContain("Contact support");
  expect(html).not.toContain("Help &amp; FAQ");
  expect(html).not.toContain("finder-faq");
  expect(html).not.toContain("mailto:support@abangcebu.ai");
});

describe("renter drawer notifications link and badge", () => {
  it("renders exactly one /notifications link labeled Notifications with Bell icon and separate badge", () => {
    const html = renderToStaticMarkup(
      <FinderNavigation
        open
        authenticated
        userRole="renter"
        userId="renter-1"
        unreadNotificationCount={120}
        unreadMessageCount={3}
        onClose={() => {}}
        preference="system"
        resolvedTheme="light"
        onPreferenceChange={() => {}}
        onAccount={() => {}}
        onHelp={() => {}}
      />
    );

    expect(html.match(/href="\/notifications"/g)).toHaveLength(1);
    expect(html).toContain("Notifications");
    expect(html).not.toContain("View all notifications");
    expect(html).toContain("lucide-bell");
    expect(html).toContain('aria-label="120 unread notifications"');
    expect(html).toContain("99+");
    // Verify messages badge remains separate
    expect(html).toContain('aria-label="3 unread messages"');
  });

  it("hides the notification badge when unread count is zero", () => {
    const html = renderToStaticMarkup(
      <FinderNavigation
        open
        authenticated
        userRole="renter"
        userId="renter-1"
        unreadNotificationCount={0}
        onClose={() => {}}
        preference="system"
        resolvedTheme="light"
        onPreferenceChange={() => {}}
        onAccount={() => {}}
        onHelp={() => {}}
      />
    );

    expect(html).toContain('href="/notifications"');
    expect(html).not.toContain("unread notifications");
    expect(html).not.toContain(">0<");
  });

  it("does not render false zero on loading or error state", () => {
    mockNotificationState.unreadCount = 0;
    mockNotificationState.loading = true;
    mockNotificationState.error = null;

    const loadingHtml = renderToStaticMarkup(
      <FinderNavigation
        open
        authenticated
        userRole="renter"
        userId="renter-1"
        onClose={() => {}}
        preference="system"
        resolvedTheme="light"
        onPreferenceChange={() => {}}
        onAccount={() => {}}
        onHelp={() => {}}
      />
    );

    expect(loadingHtml).toContain('href="/notifications"');
    expect(loadingHtml).not.toContain("unread notifications");
    expect(loadingHtml).not.toContain(">0<");

    mockNotificationState.loading = false;
    mockNotificationState.error = "Network unavailable";

    const errorHtml = renderToStaticMarkup(
      <FinderNavigation
        open
        authenticated
        userRole="renter"
        userId="renter-1"
        onClose={() => {}}
        preference="system"
        resolvedTheme="light"
        onPreferenceChange={() => {}}
        onAccount={() => {}}
        onHelp={() => {}}
      />
    );

    expect(errorHtml).toContain('href="/notifications"');
    expect(errorHtml).not.toContain("unread notifications");
    expect(errorHtml).not.toContain(">0<");

    mockNotificationState.error = null;
  });

  it("uses useNotificationCenter polled count when not provided as prop", () => {
    mockNotificationState.unreadCount = 5;
    mockNotificationState.loading = false;
    mockNotificationState.error = null;

    const html = renderToStaticMarkup(
      <FinderNavigation
        open
        authenticated
        userRole="renter"
        userId="renter-1"
        onClose={() => {}}
        preference="system"
        resolvedTheme="light"
        onPreferenceChange={() => {}}
        onAccount={() => {}}
        onHelp={() => {}}
      />
    );

    expect(html).toContain('href="/notifications"');
    expect(html).toContain('aria-label="5 unread notifications"');
    expect(html).toContain(">5<");

    mockNotificationState.unreadCount = 0;
  });
});
