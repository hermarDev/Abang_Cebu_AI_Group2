"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Bookmark, MessageCircle, CircleHelp, Headset, Map, UserRound, LogIn, LayoutDashboard, Mail } from "lucide-react";
import { AppearanceControls } from "./AppearanceControls";
import { Modal } from "@/components/ui/Modal";
import { useUnreadMessageCount } from "@/features/messages/useUnreadMessageCount";
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
  authenticated?: boolean;
  userRole?: UserRole | null;
  userId?: string | null;
  unreadMessageCount?: number;
}

export function FinderNavigation({ open, onClose, preference, resolvedTheme, onPreferenceChange, onAccount, onHelp, authenticated = false, userRole = null, userId = null, unreadMessageCount }: FinderNavigationProps) {
  const [faqOpen, setFaqOpen] = useState(false);
  const { unreadCount: polledUnread } = useUnreadMessageCount(userId, Boolean(authenticated && userId && userRole === "renter"));
  const badgeCount = unreadMessageCount ?? polledUnread;
  return (
    <Modal id="finder-navigation" open={open} onClose={onClose} title="AbangCebu Menu" hideTitle surface="finder" className={styles.dialog}
      restoreTriggerFocus={false}
      onCloseAutoFocus={(event) => {
        const chatClose = document.querySelector<HTMLButtonElement>('[aria-label="AbangCebu assistant"] button[aria-label="Close chat"]');
        event.preventDefault();
        if (chatClose) chatClose.focus();
        else document.querySelector<HTMLButtonElement>('button[aria-controls="finder-navigation"]')?.focus();
      }}
      closeControl={<button type="button" className={styles.mapButton}><Map aria-hidden="true" /><span>Map</span></button>}>
      <div className={styles.content}>
        <div className={styles.brandRow}>
          <Image src={resolvedTheme === "dark" ? "/icons/main_Logo_Light.png" : "/icons/main_Logo.png"} unoptimized alt="AbangCebu" width={299} height={100} loading="eager" className={styles.logo} />
          <p>Find your next home in Cebu</p>
        </div>
        <nav aria-label="Main menu" className={styles.mainNavigation}>
          <Link href="/" aria-current="page" className={`${styles.navItem} ${styles.currentPage}`} onClick={(event) => {
            if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
              event.preventDefault();
              onClose();
            }
          }}>
            <Search aria-hidden="true" /><span>Find rentals</span>
          </Link>
          {authenticated && userRole === "landlord" && <Link href="/landlord/dashboard" className={styles.navItem} onClick={onClose}><LayoutDashboard aria-hidden="true" /><span>Landlord workspace</span></Link>}
          {authenticated && userRole === "renter" && <Link href="/messages" className={styles.navItem} onClick={onClose}><Mail aria-hidden="true" /><span>Messages</span>{badgeCount > 0 && <span aria-label={`${badgeCount} unread messages`} className={styles.unreadBadge}>{badgeCount > 99 ? "99+" : badgeCount}</span>}</Link>}
          {(userRole === "renter" || !authenticated) && <Link href="/favorites" className={styles.navItem} onClick={onClose}><Bookmark aria-hidden="true" /><span>Saved rentals</span></Link>}
          {(userRole === "renter" || !authenticated) && <button type="button" className={styles.navItem} onClick={() => { onClose(); onHelp(); }}><MessageCircle aria-hidden="true" /><span>Help finding a rental</span></button>}
        </nav>
        <section className={styles.support} aria-labelledby="finder-support-heading">
          <h2 id="finder-support-heading">Support</h2>
          <button type="button" className={styles.navItem} aria-expanded={faqOpen} aria-controls="finder-faq" onClick={() => setFaqOpen(value => !value)}><CircleHelp aria-hidden="true" /><span>Help &amp; FAQ</span></button>
          {faqOpen && <div id="finder-faq" className={styles.faq}>
            <h3>How do I find a rental?</h3><p>Use Budget, Property type, or Filters to narrow your search.</p>
            <h3>Need more help?</h3><p>Use the map search and filters to narrow your options, or contact support.</p>
          </div>}
          <a href="mailto:support@abangcebu.ai" className={styles.navItem}><Headset aria-hidden="true" /><span>Contact support</span></a>
        </section>
        <footer className={styles.footer}>
          <AppearanceControls preference={preference} resolvedTheme={resolvedTheme} onPreferenceChange={onPreferenceChange} />
          {authenticated
            ? <Link href="/account" className={styles.accountAction}><UserRound aria-hidden="true" /><span>Account settings</span></Link>
            : <button type="button" className={styles.accountAction} onClick={onAccount}><LogIn aria-hidden="true" /><span>Log in</span></button>}
        </footer>
      </div>
    </Modal>
  );
}
