"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, Headset, LayoutDashboard, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { WorkspaceMobileNav, WorkspaceShell, type WorkspaceNavGroup } from "@/components/dashboard/WorkspaceShell";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { NotificationBell } from "@/features/notifications/NotificationBell";

const linkGroups: WorkspaceNavGroup[] = [
  {
    label: "Workspace",
    links: [
      { href: "/support-desk/dashboard", label: "Overview", Icon: LayoutDashboard },
      { href: "/support-desk/tickets", label: "Complaints queue", Icon: Headset },
    ],
  },
  { label: "Support", links: [{ href: "/help", label: "Help Center", Icon: CircleHelp }] },
  { label: "Account", links: [{ href: "/account", label: "Account settings", Icon: UserRound }] },
];

const mobileLinks = [
  { href: "/support-desk/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/support-desk/tickets", label: "Complaints", Icon: Headset },
  { href: "/help", label: "Help", Icon: CircleHelp },
  { href: "/account", label: "Account", Icon: UserRound },
];

export interface SupportDeskWorkspaceLayoutProps {
  userId?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function SupportDeskWorkspaceLayout({
  userId,
  displayName,
  avatarUrl,
  title,
  subtitle,
  actions,
  children,
}: SupportDeskWorkspaceLayoutProps) {
  const pathname = usePathname() ?? "";

  return (
    <WorkspaceShell
      pathname={pathname}
      brand={
        <Link href="/support-desk/dashboard" aria-label="AbangCebu support workspace" className="flex min-w-0 items-center gap-3">
          <BrandLogo className="h-auto w-24 sm:w-32" />
          <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">
            AbangCebu · Customer Support
          </span>
        </Link>
      }
      headerActions={
        <>
          <NotificationBell userId={userId} userRole="customer_support" />
          <AccountMenu displayName={displayName} avatarUrl={avatarUrl} role="customer_support" variant="header" />
        </>
      }
      asideAriaLabel="Support navigation"
      sidebarTitle="Support tools"
      navAriaLabel="Support workspace"
      navGroups={linkGroups}
      title={title}
      subtitle={subtitle}
      pageActions={actions}
      mobileNav={
        <WorkspaceMobileNav
          pathname={pathname}
          navAriaLabel="Support mobile navigation"
          moreAriaLabel="More support options"
          userId={userId}
          links={mobileLinks}
        />
      }
    >
      {children}
    </WorkspaceShell>
  );
}
