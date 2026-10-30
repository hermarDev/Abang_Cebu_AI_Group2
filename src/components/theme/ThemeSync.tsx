"use client";

import { useEffect } from "react";
import { useFinderTheme } from "@/features/map/useFinderTheme";

export function ThemeSync() {
  const { resolvedTheme } = useFinderTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.classList.toggle("light", resolvedTheme === "light");
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  return null;
}
