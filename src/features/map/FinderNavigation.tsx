"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import {
  Search,
  Bookmark,
  MessageSquare,
  MessageCircle,
  CircleHelp,
  Headset,
  Map,
  LogIn,
  LayoutDashboard,
  Bell,
} from "lucide-react";
import { AppearanceControls } from "./AppearanceControls";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { Modal } from "@/components/ui/Modal";
import { useUnreadMessageCount } from "@/features/messages/useUnreadMessageCount";
import { useNotificationCenter } from "@/features/notifications/useNotificationCenter";
import type { UserRole } from "@/types/database";
import styles from "./FinderNavigation.module.css";

export interface FinderNavigationProps {
  open: boolean;
  onClose: () => void;
  preference: "light" | "dark" | "system";
  resolvedTheme: "light" | "dark";
  onPreferenceChange: (preference: "light" | "dark" | "system") => void;
  onAccount: () => void;
  onHelp: () => void;
  onNotifications?: () => void;
  authenticated?: boolean;
  userRole?: UserRole | null;
  userId?: string | null;
  unreadMessageCount?: number;
  unreadNotificationCount?: number;
  displayName?: string | null;
  avatarUrl?: string | null;
}

const sectionHeaderClass = "px-3 text-[.68rem] font-extrabold uppercase tracking-[.12em] text-muted-foreground";

export function FinderNavigation({
  open,
  onClose,
  preference,
  resolvedTheme,
  onPreferenceChange,
  onAccount,
  onHelp,
  onNotifications,
  authenticated = false,
  userRole = null,
  userId = null,
  unreadMessageCount,
  unreadNotificationCount,
  displayName = null,
  avatarUrl = null,
}: FinderNavigationProps) {
  const [faqOpen, setFaqOpen] = useState(false);
  const { unreadCount: polledUnread } = useUnreadMessageCount(
    userId,
    Boolean(authenticated && userId && userRole === "renter" && unreadMessageCount === undefined)
  );
  const { unreadCount: polledNotifications } = useNotificationCenter(
    userId,
    Boolean(authenticated && userId && unreadNotificationCount === undefined)
  );
  const unreadNotifications = unreadNotificationCount ?? polledNotifications;
  const badgeCount = unreadMessageCount ?? polledUnread;

  return (
    <Modal
      id="finder-navigation"
      open={open}
      onClose={onClose}
      title="AbangCebu Menu"
      hideTitle
      surface="finder"
      className={styles.dialog}
      restoreTriggerFocus={false}
      onCloseAutoFocus={(event) => {
        const chatClose = document.querySelector<HTMLButtonElement>(
          '[aria-label="AbangCebu assistant"] button[aria-label="Close chat"]'
        );
        event.preventDefault();
        if (chatClose) chatClose.focus();
        else document.querySelector<HTMLButtonElement>('button[aria-controls="finder-navigation"]')?.focus();
      }}
      closeControl={
        <button type="button" className={styles.mapButton}>
          <Map aria-hidden="true" />
          <span>Map</span>
        </button>
      }
    >
      <div className={styles.content}>
        <div className={styles.brandRow}>
          <BrandLogo
            theme={resolvedTheme}
            className={`${styles.logo} h-auto w-32`}
          />
          <p>Find your next home in Cebu</p>
        </div>

        <nav aria-label="Main menu" className={styles.mainNavigation}>
          {/* 1. RENTALS */}
          <section className={styles.section} aria-label="Rentals">
            <p className={sectionHeaderClass}>Rentals</p>
            <Link
              href="/"
              aria-current="page"
              className={`${styles.navItem} ${styles.currentPage}`}
              onClick={(event) => {
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                  event.preventDefault();
                  onClose();
                }
              }}
            >
              <Search aria-hidden="true" />
              <span>Find rentals</span>
            </Link>
            {(userRole === "renter" || !authenticated) && (
              <Link href="/favorites" className={styles.navItem} onClick={onClose}>
                <Bookmark aria-hidden="true" />
                <span>Saved rentals</span>
              </Link>
            )}
          </section>

          {/* WORKSPACE (for landlord/admin) */}
          {authenticated && (userRole === "landlord" || userRole === "admin") && (
            <section className={styles.section} aria-label="Workspace">
              <p className={sectionHeaderClass}>Workspace</p>
              {userRole === "landlord" && (
                <Link href="/landlord/dashboard" className={styles.navItem} onClick={onClose}>
                  <LayoutDashboard aria-hidden="true" />
                  <span>Landlord workspace</span>
                </Link>
              )}
              {userRole === "admin" && (
                <Link href="/admin/dashboard" className={styles.navItem} onClick={onClose}>
                  <LayoutDashboard aria-hidden="true" />
                  <span>Admin workspace</span>
                </Link>
              )}
            </section>
          )}

          {/* 2. COMMUNICATION */}
          {authenticated && (
            <section className={styles.section} aria-label="Communication">
              <p className={sectionHeaderClass}>Communication</p>
              {userRole === "renter" && (
                <Link href="/messages" className={styles.navItem} onClick={onClose}>
                  <MessageSquare aria-hidden="true" />
                  <span>Messages</span>
                  {badgeCount > 0 && (
                    <span aria-label={`${badgeCount} unread messages`} className={styles.unreadBadge}>
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                type="button"
                className={styles.navItem}
                onClick={() => {
                  onClose();
                  onNotifications?.();
                }}
              >
                <Bell aria-hidden="true" />
                <span>Notifications</span>
                {unreadNotifications > 0 && (
                  <span aria-label={`${unreadNotifications} unread notifications`} className={styles.unreadBadge}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </button>
            </section>
          )}

          {/* 3. ASSISTANCE */}
          {(userRole === "renter" || !authenticated) && (
            <section className={styles.section} aria-label="Assistance">
              <p className={sectionHeaderClass}>Assistance</p>
              <button
                type="button"
                className={styles.navItem}
                onClick={() => {
                  onClose();
                  onHelp();
                }}
              >
                <MessageCircle aria-hidden="true" />
                <span>Help finding a rental</span>
              </button>
            </section>
          )}

          {/* 4. SUPPORT */}
          <section className={styles.section} aria-label="Support">
            <p className={sectionHeaderClass}>Support</p>
            <button
              type="button"
              className={styles.navItem}
              aria-expanded={faqOpen}
              aria-controls="finder-faq"
              onClick={() => setFaqOpen((value) => !value)}
            >
              <CircleHelp aria-hidden="true" />
              <span>Help &amp; FAQ</span>
            </button>
            {faqOpen && (
              <div id="finder-faq" className={styles.faq}>
                <h3>How do I find a rental?</h3>
                <p>Use Budget, Property type, or Filters to narrow your search.</p>
                <h3>Need more help?</h3>
                <p>Use the map search and filters to narrow your options, or contact support.</p>
              </div>
            )}
            <a href="mailto:support@abangcebu.ai" className={styles.navItem}>
              <Headset aria-hidden="true" />
              <span>Contact support</span>
            </a>
          </section>
        </nav>

        <footer className={styles.footer}>
          <AppearanceControls
            preference={preference}
            resolvedTheme={resolvedTheme}
            onPreferenceChange={onPreferenceChange}
          />
          {authenticated ? (
            <AccountMenu
              displayName={displayName}
              avatarUrl={avatarUrl}
              role={userRole ?? "Renter"}
              variant="sidebar"
              onCloseDrawer={onClose}
            />
          ) : (
            <button type="button" className={styles.accountAction} onClick={onAccount}>
              <LogIn aria-hidden="true" />
              <span>Log in</span>
            </button>
          )}
        </footer>
      </div>
    </Modal>
  );
}
