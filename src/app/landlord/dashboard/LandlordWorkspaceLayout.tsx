"use client";

import { Children, Fragment, isValidElement, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Bell, Building2, CircleHelp, Headset, HousePlus, LayoutDashboard, MapPinned, MessageSquare, UserRound } from "lucide-react";
import { isActiveWorkspacePath, WorkspaceShell, type WorkspaceNavGroup } from "@/components/dashboard/WorkspaceShell";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { LandlordMobileNav } from "@/features/landlord/LandlordMobileNav";
import { useUnreadMessageCount } from "@/features/messages/useUnreadMessageCount";
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

type LandlordWorkspaceLayoutProps = {
  brand: ReactNode;
  actions: ReactNode;
  children: ReactNode;
  userId?: string | null;
  propertiesCount?: number | null;
};

function flattenNodes(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      return flattenNodes(child.props.children);
    }
    return [child];
  });
}

function splitHeaderActions(actions: ReactNode): { leadingActions: ReactNode[]; accountMenus: ReactNode[] } {
  const leadingActions: ReactNode[] = [];
  const accountMenus: ReactNode[] = [];
  for (const node of flattenNodes(actions)) {
    if (isValidElement(node) && node.type === AccountMenu) {
      accountMenus.push(node);
    } else {
      leadingActions.push(node);
    }
  }
  return { leadingActions, accountMenus };
}

export function LandlordWorkspaceLayout({
  brand,
  actions,
  children,
  userId = null,
  propertiesCount = null,
}: LandlordWorkspaceLayoutProps) {
  const pathname = usePathname() ?? "";
  const { unreadCount } = useUnreadMessageCount(userId, Boolean(userId));
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

      return {
        ...item,
        prefetch: true,
        active: isActive,
        ariaCurrent: hash ? "location" : "page",
        ariaLabel: isMessages ? `${item.label}, ${unreadCount} unread` : item.label,
        badge: isProperties ? propertiesCount : isMessages ? (unreadCount > 99 ? "99+" : unreadCount) : null,
        badgeVariant: isMessages ? "action" : "muted",
      };
    }),
  }));

  const { leadingActions, accountMenus } = splitHeaderActions(actions);

  return (
    <WorkspaceShell
      pathname={pathname}
      brand={brand}
      headerActions={
        <>
          {leadingActions}
          <NotificationBell userId={userId} userRole="landlord" />
          {accountMenus}
        </>
      }
      asideAriaLabel="Landlord navigation"
      sidebarTitle="Landlord tools"
      navAriaLabel="Landlord workspace"
      navGroups={navGroups}
      mobileNav={<LandlordMobileNav userId={userId} unreadCount={unreadCount} />}
    >
      {children}
    </WorkspaceShell>
  );
}
