"use client";

import { Toaster, toast } from "sonner";
import { useFinderTheme } from "@/features/map/useFinderTheme";

const notificationDuration = { success: 3000, info: 3000, warning: 3000, error: 3000, loading: Infinity } as const;

export type NotifyOptions = { action?: { label: string; onClick: () => void }; description?: string };

export function notify(type: keyof typeof notificationDuration, id: string, message: string, options?: NotifyOptions) {
  return toast[type](message, { id, duration: notificationDuration[type], ...options });
}

export function AppToaster() {
  const { resolvedTheme } = useFinderTheme();
  return (
    <Toaster
      theme={resolvedTheme}
      position="top-right"
      duration={3000}
      offset={{ top: "76px", right: "20px" }}
      mobileOffset={{ top: "68px", left: "12px", right: "12px" }}
      visibleToasts={4}
      closeButton
      toastOptions={{ className: "abang-toast" }}
    />
  );
}
