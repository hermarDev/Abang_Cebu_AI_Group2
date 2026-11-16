import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export interface DashboardStatCardProps {
  href: string;
  label: string;
  value?: number | null;
  icon: ReactNode;
  iconToneClassName: string;
  description?: string;
}

export function DashboardStatCard({
  href,
  label,
  value,
  icon,
  iconToneClassName,
  description,
}: DashboardStatCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card/60 p-4 sm:p-5 transition hover:border-action/50 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex items-center justify-between">
        <span className={`grid size-10 place-items-center rounded-xl ${iconToneClassName}`}>
          {icon}
        </span>
        <ArrowUpRight
          size={18}
          className="text-muted-foreground transition group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        />
      </div>
      <div className="mt-4">
        <p className="m-0 text-3xl font-bold tracking-tight tabular-nums text-foreground sm:text-4xl">
          {value ?? "—"}
        </p>
        <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </Link>
  );
}
