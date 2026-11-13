"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, Ellipsis, Flag, Headset, LayoutDashboard, ScrollText, UserRound, Users } from "lucide-react";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { LogoutLink } from "@/components/ui/LogoutLink";
import { Modal } from "@/components/ui/Modal";
import { AppearanceControls } from "@/features/map/AppearanceControls";
import { useFinderTheme } from "@/features/map/useFinderTheme";
import { NotificationBell } from "@/features/notifications/NotificationBell";

const linkGroups = [
  { label: "Moderation", links: [
    { href: "/admin/dashboard", label: "Overview", Icon: LayoutDashboard },
    { href: "/admin/reviews", label: "Listing reviews", Icon: ClipboardCheck },
    { href: "/admin/accounts", label: "Accounts", Icon: Users },
    { href: "/admin/reports", label: "Reports", Icon: Flag },
    { href: "/admin/support", label: "Support tickets", Icon: Headset },
    { href: "/admin/audit", label: "Audit log", Icon: ScrollText },
  ] },
  { label: "Support", links: [{ href: "/help", label: "Help Center", Icon: CircleHelp }] },
  { label: "Account", links: [{ href: "/account", label: "Account settings", Icon: UserRound }] },
];

const mobileLinks = [
  { href: "/admin/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/reviews", label: "Reviews", Icon: ClipboardCheck },
  { href: "/admin/accounts", label: "Accounts", Icon: Users },
  { href: "/admin/reports", label: "Reports", Icon: Flag },
];

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function ThemeControls({ expanded }: { expanded: boolean }) {
  const { preference, resolvedTheme, setPreference } = useFinderTheme();
  return <AppearanceControls preference={preference} resolvedTheme={resolvedTheme} onPreferenceChange={setPreference} expanded={expanded} />;
}

function AdminMobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const itemClass = `flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[.65rem] font-medium ${focusRing}`;
  return <>
    <nav aria-label="Admin mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border bg-card px-1 pb-[env(safe-area-inset-bottom)] text-card-foreground lg:hidden">
      {mobileLinks.map(({ href, label, Icon }) => {
        const active = isActivePath(pathname, href);
        return <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} className={`${itemClass} ${active ? "text-action" : "text-muted-foreground hover:text-foreground"}`}>
          <Icon size={20} aria-hidden="true" /><span>{label}</span>
        </Link>;
      })}
      <button type="button" aria-label="More admin options" aria-expanded={open} onClick={() => setOpen(true)} className={`${itemClass} text-muted-foreground hover:text-foreground`}><Ellipsis size={20} aria-hidden="true" /><span>More</span></button>
    </nav>
    <Modal open={open} onClose={() => setOpen(false)} title="More admin options" className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          const bell = document.querySelector<HTMLButtonElement>('header button[aria-label^="Notifications"]');
          bell?.click();
        }}
        className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted ${focusRing}`}
      >
        <Bell size={19} aria-hidden="true" />
        Notifications
      </button>
      <Link href="/admin/support" onClick={() => setOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted ${focusRing}`}><Headset size={19} aria-hidden="true" />Support tickets</Link>
      <Link href="/admin/audit" onClick={() => setOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted ${focusRing}`}><ScrollText size={19} aria-hidden="true" />Audit log</Link>
      <Link href="/help" onClick={() => setOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted ${focusRing}`}><CircleHelp size={19} aria-hidden="true" />Help Center</Link>
      <Link href="/account" onClick={() => setOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted ${focusRing}`}><UserRound size={19} aria-hidden="true" />Account settings</Link>
      <div className="my-3"><ThemeControls expanded /></div>
      <div className="my-2 h-px bg-border/80" role="separator" />
      <LogoutLink onClick={() => setOpen(false)} iconSize={19} className="flex w-full gap-3" />
    </Modal>
  </>;
}

export interface AdminWorkspaceLayoutProps {
  userId?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminWorkspaceLayout({ userId, displayName, avatarUrl, title, subtitle, actions, children }: AdminWorkspaceLayoutProps) {
  const pathname = usePathname() ?? "";
  const [expanded, setExpanded] = useState(true);

  return <main className="min-h-[100dvh] bg-gradient-to-br from-action/5 via-background to-muted/70 pt-16 pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground lg:pb-0">
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-lg">
      <div className="mx-auto flex min-h-16 max-w-[1920px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <Link href="/admin/dashboard" aria-label="AbangCebu admin workspace" className="flex min-w-0 items-center gap-3">
          <BrandLogo className="h-auto w-24 sm:w-32" />
          <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">AbangCebu · Admin</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {actions}
          <NotificationBell userId={userId} userRole="admin" />
          <AccountMenu displayName={displayName} avatarUrl={avatarUrl} role="Admin" variant="header" />
        </div>
      </div>
    </header>

    <div className={`mx-auto grid max-w-[1920px] gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:gap-6 lg:px-8 ${expanded ? "lg:grid-cols-[248px_minmax(0,1fr)]" : "lg:grid-cols-[76px_minmax(0,1fr)]"}`}>
      <aside className="hidden min-h-[calc(100dvh-5rem)] self-stretch lg:flex lg:flex-col" aria-label="Admin navigation">
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card p-2 shadow-sm">
          <div className={`mb-1 flex min-h-10 items-center ${expanded ? "justify-between gap-2 px-2" : "justify-center"}`}>
            {expanded && <p className="m-0 min-w-0 truncate text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Admin tools</p>}
            <button type="button" aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={expanded} title={expanded ? "Collapse sidebar" : "Expand sidebar"} onClick={() => setExpanded((value) => !value)} className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground ${focusRing}`}>
              {expanded ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
            </button>
          </div>
          <nav className="grid gap-4" aria-label="Admin workspace">
            {linkGroups.map(({ label: groupLabel, links }) => <section key={groupLabel} className="grid gap-1" aria-label={groupLabel}>
              {expanded && <h3 className="mb-0 mt-1 px-3 text-[.68rem] font-extrabold uppercase tracking-[.12em] text-foreground">{groupLabel}</h3>}
              {links.map(({ href, label, Icon }) => {
                const active = isActivePath(pathname, href);
                return <Link key={href} href={href} aria-label={label} title={expanded ? undefined : label} aria-current={active ? "page" : undefined} className={`inline-flex min-h-12 items-center rounded-xl transition ${focusRing} ${expanded ? "justify-start gap-3 px-3" : "justify-center px-0"} ${active ? "bg-action/10 font-semibold text-action" : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <Icon size={19} className="shrink-0" aria-hidden="true" />{expanded && <span className="truncate">{label}</span>}
                </Link>;
              })}
            </section>)}
          </nav>
          <div className="mt-auto border-t border-border/80 pt-3"><ThemeControls expanded={expanded} /></div>
        </div>
      </aside>

      <div className="min-w-0 space-y-5 sm:space-y-6">
        {(title || actions) && <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {title && <h1 className="m-0 text-3xl font-bold tracking-tight">{title}</h1>}
            {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>}
        {children}
      </div>
    </div>
    <AdminMobileNav pathname={pathname} />
  </main>;
}
