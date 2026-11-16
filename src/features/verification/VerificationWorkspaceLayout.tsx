"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CircleHelp, ClipboardList, LayoutDashboard, Map, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { WorkspaceMobileNav, WorkspaceShell, type WorkspaceNavGroup } from "@/components/dashboard/WorkspaceShell";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { useNotificationCenter } from "@/features/notifications/useNotificationCenter";

const linkGroups: WorkspaceNavGroup[] = [
  {
    label: "Workspace",
    links: [
      { href: "/verification/dashboard", label: "Overview", Icon: LayoutDashboard },
      { href: "/verification/queue", label: "Verification queue", Icon: ClipboardList },
      { href: "/verification/map", label: "Verification map", Icon: Map },
    ],
  },
  { label: "Communication", links: [{ href: "/notifications", label: "Notifications", Icon: Bell }] },
  { label: "Support", links: [{ href: "/help", label: "Help Center", Icon: CircleHelp }] },
  { label: "Account", links: [{ href: "/account", label: "Account settings", Icon: UserRound }] },
];

const mobileLinks = [
  { href: "/verification/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/verification/queue", label: "Queue", Icon: ClipboardList },
  { href: "/verification/map", label: "Map", Icon: Map },
  { href: "/help", label: "Help", Icon: CircleHelp },
  { href: "/account", label: "Account", Icon: UserRound },
];

export interface VerificationWorkspaceLayoutProps {
  userId?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function VerificationWorkspaceLayout({
  userId,
  displayName,
  avatarUrl,
  title,
  subtitle,
  actions,
  children,
}: VerificationWorkspaceLayoutProps) {
  const pathname = usePathname() ?? "";
  const { unreadCount, loading, error } = useNotificationCenter(userId, Boolean(userId));
  const count = !loading && !error ? unreadCount : 0;
  const navGroups: WorkspaceNavGroup[] = linkGroups.map((group) => ({
    ...group,
    links: group.links.map((item) => item.href === "/notifications" && count > 0
      ? { ...item, ariaLabel: `Notifications, ${count} unread`, badge: count > 99 ? "99+" : count, badgeVariant: "action" }
      : item),
  }));

  return (
    <WorkspaceShell
      pathname={pathname}
      brand={
        <Link href="/verification/dashboard" aria-label="Field verification workspace" className="flex min-w-0 items-center gap-3">
          <BrandLogo className="h-auto w-24 sm:w-32" />
          <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">
            AbangCebu · Field Verification
          </span>
        </Link>
      }
      headerActions={
        <>
          <NotificationBell userId={userId} userRole="verification_officer" />
          <AccountMenu displayName={displayName} avatarUrl={avatarUrl} role="verification_officer" variant="header" />
        </>
      }
      asideAriaLabel="Verification navigation"
      sidebarTitle="Verification tools"
      navAriaLabel="Verification workspace"
      navGroups={navGroups}
      title={title}
      subtitle={subtitle}
      pageActions={actions}
      mobileNav={
        <WorkspaceMobileNav
          pathname={pathname}
          navAriaLabel="Verification mobile navigation"
          moreAriaLabel="More verification options"
          userId={userId}
          links={mobileLinks}
        />
      }
    >
      {children}
    </WorkspaceShell>
  );
}
