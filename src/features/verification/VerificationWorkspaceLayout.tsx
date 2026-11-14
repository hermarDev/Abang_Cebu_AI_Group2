"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  UserRound,
} from "lucide-react";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { AppearanceControls } from "@/features/map/AppearanceControls";
import { useFinderTheme } from "@/features/map/useFinderTheme";
import { NotificationBell } from "@/features/notifications/NotificationBell";

const links = [
  { href: "/verification/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/verification/queue", label: "Verification Queue", Icon: ClipboardList },
  { href: "/help", label: "Help Center", Icon: CircleHelp },
  { href: "/account", label: "Account settings", Icon: UserRound },
];

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function ThemeControls({ expanded }: { expanded: boolean }) {
  const { preference, resolvedTheme, setPreference } = useFinderTheme();
  return <AppearanceControls preference={preference} resolvedTheme={resolvedTheme} onPreferenceChange={setPreference} expanded={expanded} />;
}

export interface VerificationWorkspaceLayoutProps {
  userId?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function VerificationWorkspaceLayout({
  displayName,
  avatarUrl,
  title,
  subtitle,
  actions,
  children,
}: VerificationWorkspaceLayoutProps) {
  const pathname = usePathname() ?? "";
  const [expanded, setExpanded] = useState(true);

  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-action/5 via-background to-muted/70 pt-16 pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground lg:pb-0">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-lg">
        <div className="mx-auto flex min-h-16 max-w-[1920px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <Link href="/verification/dashboard" aria-label="Field verification workspace" className="flex min-w-0 items-center gap-3">
            <BrandLogo className="h-auto w-24 sm:w-32" />
            <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">
              AbangCebu · Field Verification
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <NotificationBell />
            <AccountMenu displayName={displayName} avatarUrl={avatarUrl} role="verification_officer" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1920px] lg:flex">
        <aside
          aria-label="Field verification sidebar"
          className={`hidden border-r border-border/80 bg-card/60 backdrop-blur lg:sticky lg:top-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:flex-col lg:justify-between lg:transition-all lg:duration-200 ${
            expanded ? "lg:w-64" : "lg:w-20"
          }`}
        >
          <div className="flex flex-col gap-1 p-3">
            <button
              type="button"
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              onClick={() => setExpanded(!expanded)}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-muted ${focusRing}`}
            >
              {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              {expanded && <span>Collapse sidebar</span>}
            </button>
            <nav className="flex flex-col gap-1 mt-2">
              {links.map(({ href, label, Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${focusRing} ${
                      active ? "bg-action/10 text-action font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {expanded && <span>{label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="p-3 border-t border-border/60">
            <ThemeControls expanded={expanded} />
          </div>
        </aside>

        <section className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              {title && <h1 className="m-0 text-2xl font-bold tracking-tight text-foreground">{title}</h1>}
              {subtitle && <p className="m-0 mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </section>
      </div>

      {/* Mobile nav */}
      <nav
        aria-label="Field verification mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border bg-card px-1 pb-[env(safe-area-inset-bottom)] text-card-foreground lg:hidden"
      >
        {links.slice(0, 2).map(({ href, label, Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[.65rem] font-medium ${focusRing} ${
                active ? "text-action font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
