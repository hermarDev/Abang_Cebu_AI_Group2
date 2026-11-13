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
    case "in_progress": return "default";
    case "resolved": return "success";
    case "closed": return "secondary";
    case "dismissed": return "secondary";
    case "urgent": return "destructive";
    case "high": return "warning";
    case "normal": return "outline";
    case "low": return "secondary";
    default: return "outline";
  }
}