"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import { Monitor, Moon, Sun } from "lucide-react";
import type { FinderResolvedTheme, FinderThemePreference } from "./useFinderTheme";
import styles from "./AppearanceControls.module.css";

export function AppearanceControls({ preference, resolvedTheme, onPreferenceChange, expanded = true }: {
  preference: FinderThemePreference;
  resolvedTheme: FinderResolvedTheme;
  onPreferenceChange: (preference: FinderThemePreference) => void;
  expanded?: boolean;
}) {
  const transitionRunning = useRef(false);

  async function changeTheme(button: HTMLButtonElement, nextTheme: FinderThemePreference) {
    if (transitionRunning.current || !document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
      onPreferenceChange(nextTheme);
    } finally {
      document.documentElement.classList.remove(styles.themeTransition);
      transitionRunning.current = false;
    }
  }

  return <fieldset className={styles.appearance} aria-label="Appearance">
    {expanded && <legend>Appearance</legend>}
    <div className={`${styles.appearanceOptions} ${expanded ? "" : styles.collapsed}`}>
      <button type="button" className={styles.themeButton} aria-pressed={preference !== "system"}
        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        title={expanded ? undefined : `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        onClick={(event) => { void changeTheme(event.currentTarget, resolvedTheme === "dark" ? "light" : "dark"); }}>
        {resolvedTheme === "dark" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
        {expanded && <span>{resolvedTheme === "dark" ? "Dark" : "Light"}</span>}
      </button>
      <button type="button" className={styles.themeButton} aria-pressed={preference === "system"}
        aria-label={expanded ? undefined : "System"} title={expanded ? undefined : "System"}
        onClick={(event) => { void changeTheme(event.currentTarget, "system"); }}>
        <Monitor aria-hidden="true" />{expanded && <span>System</span>}
      </button>
    </div>
  </fieldset>;
}
