"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, ClipboardCheck, Flag, LayoutDashboard, ScrollText, UserRound, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { WorkspaceMobileNav, WorkspaceShell, type WorkspaceNavGroup } from "@/components/dashboard/WorkspaceShell";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { NotificationBell } from "@/features/notifications/NotificationBell";

const linkGroups: WorkspaceNavGroup[] = [
  {
    label: "Moderation",
    links: [
      { href: "/admin/dashboard", label: "Overview", Icon: LayoutDashboard },
      { href: "/admin/reviews", label: "Listing reviews", Icon: ClipboardCheck },
      { href: "/admin/accounts", label: "Accounts", Icon: Users },
      { href: "/admin/reports", label: "Reports", Icon: Flag },
      { href: "/admin/audit", label: "Audit log", Icon: ScrollText },
    ],
  },
  { label: "Support", links: [{ href: "/help", label: "Help Center", Icon: CircleHelp }] },
  { label: "Account", links: [{ href: "/account", label: "Account settings", Icon: UserRound }] },
];

const mobileLinks = [
  { href: "/admin/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/reviews", label: "Reviews", Icon: ClipboardCheck },
  { href: "/admin/accounts", label: "Accounts", Icon: Users },
  { href: "/admin/reports", label: "Reports", Icon: Flag },
];

const extraModalLinks = [{ href: "/admin/audit", label: "Audit log", Icon: ScrollText }];

export interface AdminWorkspaceLayoutProps {
  userId?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminWorkspaceLayout({
  userId,
  displayName,
  avatarUrl,
  title,
  subtitle,
  actions,
  children,
}: AdminWorkspaceLayoutProps) {
  const pathname = usePathname() ?? "";

  return (
    <WorkspaceShell
      pathname={pathname}
      brand={
        <Link href="/admin/dashboard" aria-label="AbangCebu admin workspace" className="flex min-w-0 items-center gap-3">
          <BrandLogo className="h-auto w-24 sm:w-32" />
          <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">
            AbangCebu · Admin
          </span>
        </Link>
      }
      headerActions={
        <>
          <NotificationBell userId={userId} userRole="admin" />
          <AccountMenu displayName={displayName} avatarUrl={avatarUrl} role="Admin" variant="header" />
        </>
      }
      asideAriaLabel="Admin navigation"
      sidebarTitle="Admin tools"
      navAriaLabel="Admin workspace"
      navGroups={linkGroups}
      title={title}
      subtitle={subtitle}
      pageActions={actions}
      mobileNav={
        <WorkspaceMobileNav
          pathname={pathname}
          navAriaLabel="Admin mobile navigation"
          moreAriaLabel="More admin options"
          links={mobileLinks}
          extraModalLinks={extraModalLinks}
        />
      }
    >
      {children}
    </WorkspaceShell>
  );
}
