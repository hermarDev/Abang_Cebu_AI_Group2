"use client";

import { useSyncExternalStore } from "react";

export type FinderThemePreference = "light" | "dark" | "system";
export type FinderResolvedTheme = "light" | "dark";

const STORAGE_KEY = "abangcebu-theme";
const CHANGE_EVENT = "abangcebu-theme-change";
let memoryPreference: FinderThemePreference | null = null;

function readPreference(): FinderThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
    return "system";
  } catch {
    return memoryPreference ?? "system";
  }
}

function getOsTheme(): FinderResolvedTheme {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function getResolvedTheme(): FinderResolvedTheme {
  const preference = readPreference();
  return preference === "system" ? getOsTheme() : preference;
}

function subscribe(listener: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, listener);

  let media: MediaQueryList | undefined;
  const handleMediaChange = () => {
    if (readPreference() === "system") listener();
  };
  try {
    media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", handleMediaChange);
  } catch {
    // System preference remains light when matchMedia is unavailable.
  }

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, listener);
    media?.removeEventListener("change", handleMediaChange);
  };
}

const getServerPreference = () => "system" as const;
const getServerTheme = () => "light" as const;

export function useFinderTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, getServerPreference);
  const resolvedTheme = useSyncExternalStore(subscribe, getResolvedTheme, getServerTheme);

  function setPreference(value: FinderThemePreference) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
      memoryPreference = null;
    } catch {
      memoryPreference = value;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { preference, resolvedTheme, setPreference };
}
