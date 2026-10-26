"use client";

import { useState } from "react";
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

const appearanceOptions = [
  { label: "Light", value: "light", Icon: Sun },
  { label: "Dark", value: "dark", Icon: Moon },
  { label: "System", value: "system", Icon: Monitor },
] as const;

export function FinderNavigation({ open, onClose, preference, resolvedTheme, onPreferenceChange, onAccount, onHelp, authenticated = false }: FinderNavigationProps) {
  const [faqOpen, setFaqOpen] = useState(false);
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
              {appearanceOptions.map(({ label, value, Icon }) => (
                <label key={value} title={label} className={styles.appearanceOption}>
                  <input type="radio" aria-label={label} name="finder-appearance" value={value} checked={preference === value} onChange={() => onPreferenceChange(value)} />
                  <Icon aria-hidden="true" />
                </label>
              ))}
            </div>
          </fieldset>
          {authenticated
            ? <Link href="/auth/logout" className={styles.accountAction}><UserRound aria-hidden="true" /><span>Account / Sign out</span></Link>
            : <button type="button" className={styles.accountAction} onClick={onAccount}><LogIn aria-hidden="true" /><span>Log in</span></button>}
        </footer>
      </div>
    </Modal>
  );
}
