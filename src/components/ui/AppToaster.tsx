"use client";

import { Toaster, toast } from "sonner";
import { useFinderTheme } from "@/features/map/useFinderTheme";

const notificationDuration = { success: 4000, info: 5000, warning: 6000, error: 6000, loading: Infinity } as const;

export function notify(type: keyof typeof notificationDuration, id: string, message: string) {
  return toast[type](message, { id, duration: notificationDuration[type] });
}

export function AppToaster() {
  const { resolvedTheme } = useFinderTheme();
  return <Toaster position="top-center" offset={{ top: "calc(112px + env(safe-area-inset-top, 0px))" }} mobileOffset={{ top: "calc(112px + env(safe-area-inset-top, 0px))" }} theme={resolvedTheme} closeButton toastOptions={{ duration: 4000 }} />;
}
