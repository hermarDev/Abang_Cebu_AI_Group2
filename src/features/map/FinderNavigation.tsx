"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Search, Bookmark, MessageCircle, HousePlus, CircleHelp, Headset, Map, UserRound, LogIn, Sun, Moon, Monitor } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
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
}

export function FinderNavigation({ open, onClose, preference, resolvedTheme, onPreferenceChange, onAccount, onHelp, authenticated = false }: FinderNavigationProps) {
  const [faqOpen, setFaqOpen] = useState(false);
  const transitionRunning = useRef(false);

  async function toggleTheme(button: HTMLButtonElement) {
    if (transitionRunning.current) {
      onPreferenceChange(resolvedTheme === "dark" ? "light" : "dark");
      return;
    }
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onPreferenceChange(nextTheme);
      return;
    }
    const { left, top, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    transitionRunning.current = true;
    document.documentElement.classList.add(styles.themeTransition);
    try {
      const transition = document.startViewTransition(() => flushSync(() => onPreferenceChange(nextTheme)));
      await transition.ready;
      await document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 450, easing: "ease-out", pseudoElement: "::view-transition-new(root)" },
      ).finished;
      await transition.finished;
    } catch {
      // A skipped transition must never prevent the requested theme from applying.
      onPreferenceChange(nextTheme);
    } finally {
      document.documentElement.classList.remove(styles.themeTransition);
      transitionRunning.current = false;
    }
  }
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
          <Image src={resolvedTheme === "dark" ? "/icons/main_Logo_Light.png" : "/icons/main_Logo.png"} unoptimized alt="AbangCebu" width={140} height={41} className={styles.logo} />
          <p>Find your next home in Cebu</p>
        </div>
        <nav aria-label="Main menu" className={styles.mainNavigation}>
          <Link href="/" aria-current="page" className={`${styles.navItem} ${styles.currentPage}`} onClick={(event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onClose(); } }}>
            <Search aria-hidden="true" /><span>Find rentals</span>
          </Link>
          <button type="button" className={styles.navItem} onClick={onAccount}><Bookmark aria-hidden="true" /><span>Saved rentals</span></button>
          <button type="button" className={styles.navItem} onClick={() => { onClose(); onHelp(); }}><MessageCircle aria-hidden="true" /><span>Help finding a rental</span></button>
          <button type="button" className={styles.navItem} onClick={onAccount}><HousePlus aria-hidden="true" /><span>List your property</span></button>
        </nav>
        <section className={styles.support} aria-labelledby="finder-support-heading">
          <h2 id="finder-support-heading">Support</h2>
          <button type="button" className={styles.navItem} aria-expanded={faqOpen} aria-controls="finder-faq" onClick={() => setFaqOpen(value => !value)}><CircleHelp aria-hidden="true" /><span>Help &amp; FAQ</span></button>
          {faqOpen && <div id="finder-faq" className={styles.faq}>
            <h3>How do I find a rental?</h3><p>Use Budget, Property type, or Filters to narrow your search.</p>
            <h3>Need more help?</h3><p>Open Help finding a rental for search tools, or contact support.</p>
          </div>}
          <a href="mailto:support@abangcebu.ai" className={styles.navItem}><Headset aria-hidden="true" /><span>Contact support</span></a>
        </section>
        <footer className={styles.footer}>
          <fieldset className={styles.appearance}>
            <legend>Appearance</legend>
            <div className={styles.appearanceOptions}>
              <button type="button" className={styles.manualTheme} aria-pressed={preference !== "system"}
                aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
                onClick={(event) => { void toggleTheme(event.currentTarget); }}>
                {resolvedTheme === "dark" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
                <span>{resolvedTheme === "dark" ? "Dark" : "Light"}</span>
              </button>
              <button type="button" className={styles.systemTheme} aria-pressed={preference === "system"} onClick={() => onPreferenceChange("system")}>
                <Monitor aria-hidden="true" /><span>System</span>
              </button>
            </div>
            {preference === "system" && <p className={styles.themeHint}>Matches your device appearance.</p>}
          </fieldset>
          {authenticated
            ? <Link href="/auth/logout" className={styles.accountAction}><UserRound aria-hidden="true" /><span>Account / Sign out</span></Link>
            : <button type="button" className={styles.accountAction} onClick={onAccount}><LogIn aria-hidden="true" /><span>Log in</span></button>}
        </footer>
      </div>
    </Modal>
  );
}
