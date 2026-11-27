"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { markNavigationEnd, markNavigationStart, observeSoftNavigationPaints } from "@/lib/navigation-timing";

export default function NavigationTiming() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor) return;
      if (anchor.getAttribute("target") === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      markNavigationStart();
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      markNavigationEnd();
      previousPathname.current = pathname;
    }
  }, [pathname]);

  useEffect(() => observeSoftNavigationPaints() ?? undefined, []);

  return null;
}
