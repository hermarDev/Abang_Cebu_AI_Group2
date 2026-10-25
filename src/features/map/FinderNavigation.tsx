"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, Compass, HelpCircle, PlusCircle, UserRound, Sun, Moon, Monitor } from "lucide-react";
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
}

const appearanceOptions = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
] as const;

export function FinderNavigation({
  open,
  onClose,
  preference,
  resolvedTheme,
  onPreferenceChange,
  onAccount,
  onHelp,
}: FinderNavigationProps) {
  return (
    <Modal id="finder-navigation" open={open} onClose={onClose} title="AbangCebu Menu" surface="finder" className={styles.dialog}>
      <div className={styles.content}>
        <div className={styles.brandRow}>
          <Image
            src={resolvedTheme === "dark" ? "/icons/main_Logo_Light.png" : "/icons/main_Logo.png"}
            alt="AbangCebu"
            width={140}
            height={41}
            className={styles.logo}
          />
        </div>

        <nav aria-label="Main menu" className={styles.mainNavigation}>
          <Link href="/" aria-current="page" className={`${styles.navItem} ${styles.currentPage}`} onClick={onClose}>
            <Compass size={18} aria-hidden="true" />
            <span>Find rentals</span>
          </Link>
          <button type="button" className={styles.navItem} onClick={onAccount}>
            <Bookmark size={18} aria-hidden="true" />
            <span>Saved rentals</span>
          </button>
          <button type="button" className={styles.navItem} onClick={onAccount}>
            <PlusCircle size={18} aria-hidden="true" />
            <span>List your property</span>
          </button>
        </nav>

        <section className={styles.support} aria-labelledby="finder-support-heading">
          <h2 id="finder-support-heading">Support</h2>
          <button type="button" className={styles.navItem} onClick={() => { onClose(); onHelp(); }}>
            <HelpCircle size={18} aria-hidden="true" />
            <span>Help finding a rental</span>
          </button>
          <a href="mailto:support@abangcebu.ai" className={styles.navItem}>
            <HelpCircle size={18} aria-hidden="true" />
            <span>Contact support</span>
          </a>
        </section>

        <footer className={styles.footer}>
          <fieldset className={styles.appearance}>
            <legend>Appearance</legend>
            <div className={styles.appearanceOptions}>
              {appearanceOptions.map(({ label, value }) => (
                <label key={value} title={label} className={styles.appearanceOption}>
                  <input
                    type="radio"
                    aria-label={label}
                    name="finder-appearance"
                    value={value}
                    checked={preference === value}
                    onChange={() => onPreferenceChange(value)}
                  />
                  {value === "light" ? <Sun size={19} aria-hidden="true" /> : value === "dark" ? <Moon size={19} aria-hidden="true" /> : <Monitor size={19} aria-hidden="true" />}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="button" className={styles.accountAction} onClick={onAccount}>
            <UserRound size={18} aria-hidden="true" />
            <span>Log in / Create account</span>
          </button>
        </footer>
      </div>
    </Modal>
  );
}
