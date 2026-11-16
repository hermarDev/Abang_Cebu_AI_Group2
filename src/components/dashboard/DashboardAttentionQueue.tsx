import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface DashboardAttentionItem {
  key?: string;
  href: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  iconToneClassName: string;
  badge?: string | number | null;
  badgeToneClassName?: string;
  trailingLabel?: string;
}

export interface DashboardAttentionQueueProps {
  id?: string;
  ariaLabel?: string;
  title: string;
  action?: {
    href: string;
    label: string;
  };
  items: DashboardAttentionItem[];
  emptyMessage?: string;
}

export function DashboardAttentionQueue({
  id,
  ariaLabel,
  title,
  action,
  items,
  emptyMessage = "Nothing requires attention right now.",
}: DashboardAttentionQueueProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel ?? title}
      className="rounded-2xl border border-border/90 bg-muted/20 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/70">
        <h3 className="m-0 text-base font-bold text-foreground sm:text-lg">{title}</h3>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-action underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span>{action.label}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : (
          <ArrowRight size={16} className="text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      {items.length > 0 ? (
        <div className="divide-y divide-border/60">
          {items.map((item) => (
            <Link
              key={item.key ?? item.href}
              href={item.href}
              className="group flex min-h-11 items-center justify-between gap-3 py-3.5 transition hover:text-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.iconToneClassName}`}>
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold text-foreground group-hover:text-action truncate">
                    {item.title}
                  </p>
                  {item.subtitle ? (
                    <p className="m-0 text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.badge !== undefined && item.badge !== null && item.badge !== "" && item.badge !== 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      item.badgeToneClassName ?? "bg-muted text-foreground"
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
                {item.trailingLabel ? (
                  <span className="text-xs font-semibold text-action dark:text-primary">{item.trailingLabel}</span>
                ) : null}
                <ChevronRight
                  size={16}
                  className="text-muted-foreground transition group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="m-0 py-4 text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </section>
  );
}
