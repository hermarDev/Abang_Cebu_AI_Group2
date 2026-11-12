"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/components/ui/cn";

export interface NotificationBellProps {
  userId?: string | null;
  userRole?: "renter" | "landlord" | "admin" | null;
  className?: string;
}

export function NotificationBell({ userId, className }: NotificationBellProps) {
  if (!userId) return null;

  return (
    <Link
      href="/notifications"
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-full bg-muted/80 text-foreground border border-border/80 transition-all hover:bg-muted hover:border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
      aria-label="Notifications"
    >
      <Bell size={18} aria-hidden="true" />
    </Link>
  );
}