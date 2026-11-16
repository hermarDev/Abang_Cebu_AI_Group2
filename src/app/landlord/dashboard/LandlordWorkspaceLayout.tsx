"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Bell, Building2, CircleHelp, Headset, HousePlus, LayoutDashboard, MapPinned, MessageSquare, UserRound } from "lucide-react";
import { isActiveWorkspacePath, WorkspaceShell, type WorkspaceNavGroup } from "@/components/dashboard/WorkspaceShell";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { LandlordMobileNav } from "@/features/landlord/LandlordMobileNav";
import { useUnreadMessageCount } from "@/features/messages/useUnreadMessageCount";
import { useNotificationCenter } from "@/features/notifications/useNotificationCenter";
import { NotificationBell } from "@/features/notifications/NotificationBell";

const baseLinkGroups = [
  {
    label: "Workspace",
    links: [{ href: "/landlord/dashboard#overview", label: "Overview", Icon: LayoutDashboard }],
  },
  {
    label: "Property",
    links: [
      { href: "/landlord/properties", label: "My properties", Icon: Building2 },
      { href: "/list-property", label: "Add property", Icon: HousePlus },
      { href: "/landlord/map", label: "Property map", Icon: MapPinned },
    ],
  },
  {
    label: "Communication",
    links: [
      { href: "/landlord/messages", label: "Messages", Icon: MessageSquare },
      { href: "/notifications", label: "Notifications", Icon: Bell },
    ],
  },
  {
    label: "Account",
    links: [{ href: "/account", label: "Account settings", Icon: UserRound }],
  },
  {
    label: "Support",
    links: [
      { href: "/help", label: "Help Center", Icon: CircleHelp },
      { href: "/support", label: "Contact support", Icon: Headset },
    ],
  },
];

export interface LandlordWorkspaceLayoutProps {
  brand: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  userId?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  propertiesCount?: number | null;
}

export function LandlordWorkspaceLayout({
  brand,
  actions,
  children,
  userId = null,
  displayName = null,
  avatarUrl = null,
  role = "Landlord",
  propertiesCount = null,
}: LandlordWorkspaceLayoutProps) {
  const pathname = usePathname() ?? "";
  const { unreadCount } = useUnreadMessageCount(userId, Boolean(userId));
  const { unreadCount: notificationCount } = useNotificationCenter(userId, Boolean(userId));
  const [activeHash, setActiveHash] = useState("#overview");

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash || "#overview");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const navGroups: WorkspaceNavGroup[] = baseLinkGroups.map((group) => ({
    label: group.label,
    links: group.links.map((item) => {
      const path = item.href.split("#")[0];
      const hash = item.href.includes("#") ? item.href.slice(item.href.indexOf("#")) : "";
      const isActive = hash ? pathname === path && activeHash === hash : isActiveWorkspacePath(pathname, path);
      const isProperties = item.href === "/landlord/properties" && typeof propertiesCount === "number" && propertiesCount > 0;
      const isMessages = item.href === "/landlord/messages" && unreadCount > 0;
      const isNotifications = item.href === "/notifications" && notificationCount > 0;

      return {
        ...item,
        prefetch: true,
        active: isActive,
        ariaCurrent: hash ? "location" : "page",
        ariaLabel: isMessages
          ? `${item.label}, ${unreadCount} unread`
          : isNotifications
          ? `${item.label}, ${notificationCount} unread`
          : item.label,
        badge: isProperties
          ? propertiesCount
          : isMessages
          ? (unreadCount > 99 ? "99+" : unreadCount)
          : isNotifications
          ? (notificationCount > 99 ? "99+" : notificationCount)
          : null,
        badgeVariant: isMessages || isNotifications ? "action" : "muted",
      };
    }),
  }));

  return (
    <WorkspaceShell
      pathname={pathname}
      brand={brand}
      headerActions={
        <>
          {actions}
          <NotificationBell userId={userId} userRole="landlord" />
          <AccountMenu displayName={displayName} avatarUrl={avatarUrl} role={role ?? "Landlord"} variant="header" />
        </>
      }
      asideAriaLabel="Landlord navigation"
      sidebarTitle="Landlord tools"
      navAriaLabel="Landlord workspace"
      navGroups={navGroups}
      mobileNav={<LandlordMobileNav userId={userId} unreadCount={unreadCount} unreadNotifications={notificationCount} />}
    >
      {children}
    </WorkspaceShell>
  );
}