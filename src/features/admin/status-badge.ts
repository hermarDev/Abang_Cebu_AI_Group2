"use client";

export type StatusBadgeVariant = "default" | "success" | "warning" | "destructive" | "secondary" | "outline";

export function statusBadgeVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case "pending": return "warning";
    case "approved": return "success";
    case "rejected": return "destructive";
    case "archived": return "secondary";
    case "active": return "success";
    case "suspended": return "destructive";
    case "open": return "warning";
    case "resolved": return "secondary";
    case "dismissed": return "secondary";
    default: return "outline";
  }
}