"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { Bell, ChevronLeft, ChevronRight, CircleHelp, Ellipsis, UserRound } from "lucide-react";
import { LogoutLink } from "@/components/ui/LogoutLink";
import { Modal } from "@/components/ui/Modal";
import { AppearanceControls } from "@/features/map/AppearanceControls";
import { useFinderTheme } from "@/features/map/useFinderTheme";
import { useNotificationCenter } from "@/features/notifications/useNotificationCenter";

export interface WorkspaceIconProps {
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

export interface WorkspaceNavItem {
  href: string;
  label: string;
  Icon: ComponentType<WorkspaceIconProps>;
  ariaLabel?: string;
  badge?: string | number | null;
  badgeVariant?: "muted" | "action";
  prefetch?: boolean;
  active?: boolean;
  ariaCurrent?: "page" | "location";
}

export interface WorkspaceNavGroup {
  label: string;
  links: WorkspaceNavItem[];
}

export interface WorkspaceMobileNavLink {
  href: string;
  label: string;
  Icon: ComponentType<WorkspaceIconProps>;
}

export interface WorkspaceMobileNavProps {
  pathname: string;
  navAriaLabel: string;
  moreAriaLabel: string;
  userId?: string | null;
  links: WorkspaceMobileNavLink[];
  extraModalLinks?: WorkspaceMobileNavLink[];
}

export interface WorkspaceShellProps {
  pathname: string;
  brand: ReactNode;
  headerActions?: ReactNode;
  asideAriaLabel: string;
  sidebarTitle: string;
  navAriaLabel: string;
  navGroups: WorkspaceNavGroup[];
  title?: string;
  subtitle?: string;
  pageActions?: ReactNode;
  mobileNav?: ReactNode;
  children: ReactNode;
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function isActiveWorkspacePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function WorkspaceThemeControls({ expanded }: { expanded: boolean }) {
  const { preference, resolvedTheme, setPreference } = useFinderTheme();
  return (
    <AppearanceControls
      preference={preference}
      resolvedTheme={resolvedTheme}
      onPreferenceChange={setPreference}
      expanded={expanded}
    />
  );
}

export function WorkspaceMobileNav({
  pathname,
  navAriaLabel,
  moreAriaLabel,
  userId,
  links,
  extraModalLinks = [],
}: WorkspaceMobileNavProps) {
  const [open, setOpen] = useState(false);
  const { unreadCount, loading, error } = useNotificationCenter(userId, Boolean(userId));
  const notificationsKnown = !loading && !error;
  const itemClass = `flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[.65rem] font-medium ${focusRing}`;

  return (
    <>
      <nav
        aria-label={navAriaLabel}
        className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border bg-card px-1 pb-[env(safe-area-inset-bottom)] text-card-foreground lg:hidden"
      >
        {links.map(({ href, label, Icon }) => {
          const active = isActiveWorkspacePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`${itemClass} ${active ? "text-action" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-label={moreAriaLabel}
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={`${itemClass} text-muted-foreground hover:text-foreground`}
        >
          <Ellipsis size={20} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={moreAriaLabel}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
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
          <span>Notifications</span>
          {notificationsKnown && unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} unread notifications`}
              className="ml-auto rounded-full bg-action px-1.5 text-xs font-bold leading-5 text-action-foreground"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        {extraModalLinks.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted ${focusRing}`}
          >
            <Icon size={19} aria-hidden="true" />
            {label}
          </Link>
        ))}
        <Link
          href="/help"
          onClick={() => setOpen(false)}
          className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted ${focusRing}`}
        >
          <CircleHelp size={19} aria-hidden="true" />
          Help Center
        </Link>
        <Link
          href="/account"
          onClick={() => setOpen(false)}
          className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted ${focusRing}`}
        >
          <UserRound size={19} aria-hidden="true" />
          Account settings
        </Link>
        <div className="my-3">
          <WorkspaceThemeControls expanded />
        </div>
        <div className="my-2 h-px bg-border/80" role="separator" />
        <LogoutLink onClick={() => setOpen(false)} iconSize={19} className="flex w-full gap-3" />
      </Modal>
    </>
  );
}

export function WorkspaceShell({
  pathname,
  brand,
  headerActions,
  asideAriaLabel,
  sidebarTitle,
  navAriaLabel,
  navGroups,
  title,
  subtitle,
  pageActions,
  mobileNav,
  children,
}: WorkspaceShellProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-gradient-to-br from-action/5 via-background to-muted/70 pt-16 text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-lg">
        <div className="mx-auto flex min-h-16 max-w-[1920px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">{brand}</div>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">{headerActions}</div>
          ) : null}
        </div>
      </header>

      <div
        className={`mx-auto grid min-h-0 w-full max-w-[1920px] flex-1 gap-4 overflow-hidden px-3 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:gap-5 sm:px-6 sm:pt-6 lg:gap-6 lg:px-8 lg:py-6 ${
          expanded ? "lg:grid-cols-[248px_minmax(0,1fr)]" : "lg:grid-cols-[76px_minmax(0,1fr)]"
        }`}
      >
        <aside className="hidden min-h-0 lg:flex lg:flex-col" aria-label={asideAriaLabel}>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-2 shadow-sm">
            <div className={`mb-1 flex min-h-10 items-center ${expanded ? "justify-between gap-2 px-2" : "justify-center"}`}>
              {expanded && (
                <p className="m-0 min-w-0 truncate text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">
                  {sidebarTitle}
                </p>
              )}
              <button
                type="button"
                aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                aria-expanded={expanded}
                title={expanded ? "Collapse sidebar" : "Expand sidebar"}
                onClick={() => setExpanded((value) => !value)}
                className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground ${focusRing}`}
              >
                {expanded ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
              </button>
            </div>
            <nav className="grid gap-4" aria-label={navAriaLabel}>
              {navGroups.map(({ label: groupLabel, links }) => (
                <section key={groupLabel} className="grid gap-1" aria-label={groupLabel}>
                  {expanded && (
                    <h3 className="mb-0 mt-1 px-3 text-[.68rem] font-extrabold uppercase tracking-[.12em] text-foreground">
                      {groupLabel}
                    </h3>
                  )}
                  {links.map(({ href, label, Icon, ariaLabel, badge, badgeVariant = "muted", prefetch, active: activeOverride, ariaCurrent }) => {
                    const active = activeOverride ?? isActiveWorkspacePath(pathname, href);
                    const hasBadge = badge !== null && badge !== undefined && badge !== "";
                    return (
                      <Link
                        key={href}
                        href={href}
                        prefetch={prefetch}
                        aria-label={ariaLabel ?? label}
                        title={expanded ? undefined : label}
                        aria-current={active ? (ariaCurrent ?? "page") : undefined}
                        className={`inline-flex min-h-12 items-center rounded-xl transition ${focusRing} ${
                          expanded ? "justify-start gap-3 px-3" : "justify-center px-0"
                        } ${active ? "bg-action/10 font-semibold text-action" : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                      >
                        <Icon size={19} className="shrink-0" aria-hidden="true" />
                        {expanded && <span className="truncate">{label}</span>}
                        {hasBadge && (
                          <span
                            className={`rounded-full text-xs font-bold ${
                              badgeVariant === "action"
                                ? "bg-action px-1.5 leading-5 text-action-foreground"
                                : "bg-muted px-2 py-0.5 text-foreground"
                            } ${expanded ? "ml-auto" : "sr-only"}`}
                          >
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </section>
              ))}
            </nav>
            <div className="mt-auto border-t border-border/80 pt-3">
              <WorkspaceThemeControls expanded={expanded} />
            </div>
          </div>
        </aside>

        <div className="min-h-0 min-w-0 space-y-5 overflow-y-auto overscroll-contain sm:space-y-6" tabIndex={0} role="region" aria-label="Workspace content">
          {(title || pageActions) && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {title && <h1 className="m-0 text-3xl font-bold tracking-tight">{title}</h1>}
                {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
              </div>
              {pageActions && <div className="flex items-center gap-2">{pageActions}</div>}
            </div>
          )}
          {children}
        </div>
      </div>

      {mobileNav}
    </main>
  );
}
