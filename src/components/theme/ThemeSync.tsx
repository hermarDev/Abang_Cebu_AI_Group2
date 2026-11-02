"use client";

import { useEffect } from "react";
import { getResolvedTheme, useFinderTheme } from "@/features/map/useFinderTheme";

export function ThemeSync() {
  const { resolvedTheme } = useFinderTheme();

  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = getResolvedTheme();
    root.classList.toggle("dark", currentTheme === "dark");
    root.classList.toggle("light", currentTheme === "light");
    root.style.colorScheme = currentTheme;
  }, [resolvedTheme]);

  return null;
}
