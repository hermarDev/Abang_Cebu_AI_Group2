"use client";

import { useEffect } from "react";

export default function StartupReady() {
  useEffect(() => {
    document.documentElement.dataset.startup = "ready";
  }, []);

  return null;
}
