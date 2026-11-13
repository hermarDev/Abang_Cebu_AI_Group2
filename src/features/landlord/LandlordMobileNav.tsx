"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, CircleHelp, Ellipsis, Headset, HousePlus, LayoutDashboard, MapPinned, MessageSquare, UserRound } from "lucide-react";
import { LogoutLink } from "@/components/ui/LogoutLink";
import { Modal } from "@/components/ui/Modal";
import { AppearanceControls } from "@/features/map/AppearanceControls";
import { useFinderTheme } from "@/features/map/useFinderTheme";
import { useUnreadMessageCount } from "@/features/messages/useUnreadMessageCount";
import { useNotificationCenter } from "@/features/notifications/useNotificationCenter";
import { NotificationsModal } from "@/features/notifications/NotificationsModal";

const links = [
  { href: "/landlord/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/landlord/properties", label: "Properties", Icon: Building2 },
  { href: "/list-property", label: "Add listing", Icon: HousePlus },
  { href: "/account", label: "Account", Icon: UserRound },
];

export function LandlordMobileNav({ userId = null, unreadCount: providedUnread, unreadNotifications: providedNotifications }: { userId?: string | null; unreadCount?: number; unreadNotifications?: number } = {}) {
  const pathname = usePathname();
  const { unreadCount: polledUnread } = useUnreadMessageCount(userId, Boolean(userId) && providedUnread === undefined);
  const { unreadCount: polledNotifications } = useNotificationCenter(userId, Boolean(userId) && providedNotifications === undefined);
  const unreadNotifications = providedNotifications ?? polledNotifications;
  const unreadCount = providedUnread ?? polledUnread;
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { preference, resolvedTheme, setPreference } = useFinderTheme();
  const itemClass = "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[.65rem] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return <>(
    <nav aria-label="Landlord mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border bg-card px-1 pb-[env(safe-area-inset-bottom)] text-card-foreground lg:hidden">
      {links.map(({ href, label, Icon }) => <Link key={href} href={href} prefetch={true} aria-label={label} aria-current={pathname === href ? "page" : undefined} className={`${itemClass} ${pathname === href ? "text-action" : "text-muted-foreground hover:text-foreground"}`}>
        <Icon size={20} aria-hidden="true" /><span>{label}</span>
      </Link>)}
      <button type="button" aria-label="More landlord options" aria-expanded={open} onClick={() => setOpen(true)} className={`${itemClass} text-muted-foreground hover:text-foreground`}><Ellipsis size={20} aria-hidden="true" /><span>More</span></button>
    </nav>
    <Modal open={open} onClose={() => setOpen(false)} title="More landlord options" className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <AppearanceControls preference={preference} resolvedTheme={resolvedTheme} onPreferenceChange={setPreference} expanded />
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setNotificationsOpen(true);
        }}
        className="mt-4 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Bell size={19} aria-hidden="true" />
        Notifications
        {unreadNotifications > 0 && (
          <span aria-label={`${unreadNotifications} unread notifications`} className="ml-auto rounded-full bg-destructive px-1.5 text-xs font-bold leading-5 text-destructive-foreground">
            {unreadNotifications > 99 ? "99+" : unreadNotifications}
          </span>
        )}
      </button>
      <Link href="/notifications" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Bell size={19} aria-hidden="true" />
        View all notifications
      </Link>
      <Link href="/landlord/map" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><MapPinned size={19} aria-hidden="true" />Property map</Link>
      <Link href="/landlord/messages" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><MessageSquare size={19} aria-hidden="true" />Messages{unreadCount > 0 && <span aria-label={`${unreadCount} unread messages`} className="ml-auto rounded-full bg-action px-1.5 text-xs font-bold leading-5 text-action-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}</Link>
      <Link href="/help" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><CircleHelp size={19} aria-hidden="true" />Help Center</Link>
      <Link href="/support" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Headset size={19} aria-hidden="true" />Contact support</Link>
      <div className="my-2 h-px bg-border/80" role="separator" />
      <LogoutLink onClick={() => setOpen(false)} iconSize={19} className="flex w-full gap-3" />
    </Modal>
    <NotificationsModal
      userId={userId}
      open={notificationsOpen}
      onClose={() => setNotificationsOpen(false)}
    />
  </>;
}
