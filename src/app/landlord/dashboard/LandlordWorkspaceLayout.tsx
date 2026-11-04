"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFinderTheme } from "@/features/map/useFinderTheme";
import { ChevronLeft, ChevronRight, Headset, HousePlus, MapPinned, Menu, Monitor, Moon, Sun, UserRound, X } from "lucide-react";

const linkGroups = [
  {
    label: "Property",
    links: [
      { href: "/list-property#property-details-heading", label: "List a property", Icon: HousePlus },
      { href: "/landlord/map", label: "Property map", Icon: MapPinned },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/account", label: "Account settings", Icon: UserRound },
    ],
  },
  {
    label: "Support",
    links: [
      { href: "mailto:support@abangcebu.ai", label: "Contact Support", Icon: Headset },
    ],
  },
];

type LandlordWorkspaceLayoutProps = {
  brand: ReactNode;
  actions: ReactNode;
  children: ReactNode;
};

function AppearanceControls({ expanded }: { expanded: boolean }) {
  const { preference, resolvedTheme, setPreference } = useFinderTheme();

  return <section className="grid gap-2" aria-label="Appearance">
    {expanded && <p className="m-0 px-2 text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Appearance</p>}
    <div className={`grid gap-1 ${expanded ? "grid-cols-2" : "grid-cols-1"}`}>
      <button
        type="button"
        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        aria-pressed={preference !== "system"}
        title={expanded ? undefined : `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        onClick={() => setPreference(resolvedTheme === "dark" ? "light" : "dark")}
        className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${preference !== "system" ? "border-action/30 bg-action/10 text-action" : "border-border text-muted-foreground hover:bg-muted"}`}
      >
        {resolvedTheme === "dark" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
        {expanded && <span>{resolvedTheme === "dark" ? "Dark" : "Light"}</span>}
      </button>
      <button
        type="button"
        aria-label="Use system appearance"
        aria-pressed={preference === "system"}
        title={expanded ? undefined : "Use system appearance"}
        onClick={() => setPreference("system")}
        className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${preference === "system" ? "border-action/30 bg-action/10 text-action" : "border-border text-muted-foreground hover:bg-muted"}`}
      >
        <Monitor size={16} aria-hidden="true" />
        {expanded && <span>System</span>}
      </button>
    </div>
  </section>;
}
export function LandlordWorkspaceLayout({ brand, actions, children }: LandlordWorkspaceLayoutProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("#overview");
  const mobileDrawerRef = useRef<HTMLElement>(null);

  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash || "#overview");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    const desktopBreakpoint = window.matchMedia("(min-width: 1024px)");
    const closeMobileNavOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };
    desktopBreakpoint.addEventListener("change", closeMobileNavOnDesktop);
    return () => desktopBreakpoint.removeEventListener("change", closeMobileNavOnDesktop);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileDrawerRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        mobileTriggerRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        const focusable = mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  const closeMobileNav = () => {
    setMobileOpen(false);
    mobileTriggerRef.current?.focus();
  };

  const renderLinks = (isExpanded: boolean, closeOnNavigate = false, mobile = false) => <div className={`grid ${mobile ? "gap-2" : "gap-4"}`}>
    {linkGroups.map(({ label: groupLabel, links: groupLinks }, index) => <section key={groupLabel} className={`grid gap-1 ${mobile && index > 0 ? "border-t border-border/70 pt-3" : ""}`} aria-label={groupLabel}>
      {isExpanded && <h3 className="mb-0 mt-1 px-3 text-[.68rem] font-extrabold uppercase tracking-[.12em] text-foreground">{groupLabel}</h3>}
      {groupLinks.map(({ href, label, Icon }) => {
        const path = href.split("#")[0];
        const hash = href.includes("#") ? href.slice(href.indexOf("#")) : "";
        const isActive = hash
          ? pathname === path && activeHash === hash
          : (pathname === path || pathname.startsWith(`${path}/`));

        return <Link
          key={href}
          href={href}
          onClick={closeOnNavigate ? closeMobileNav : undefined}
          title={isExpanded ? undefined : label}
          aria-label={label}
          aria-current={isActive ? (hash ? "location" : "page") : undefined}
          className={`inline-flex min-h-12 items-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isExpanded ? "justify-start gap-3 px-3" : "justify-center px-0"} ${isActive ? "bg-action/10 font-semibold text-action" : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          <Icon size={19} className="shrink-0" aria-hidden="true" />
          {isExpanded && <span className="truncate">{label}</span>}
        </Link>;
      })}
    </section>)}
  </div>;

  return <main className="min-h-[100dvh] bg-gradient-to-br from-action/5 via-background to-muted/70 pt-16 text-foreground">
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-lg">
      <div className="mx-auto flex min-h-16 max-w-[1920px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            ref={mobileTriggerRef}
            type="button"
            aria-label={mobileOpen ? "Close landlord navigation" : "Open landlord navigation"}
            aria-expanded={mobileOpen}
            aria-controls="landlord-mobile-navigation"
            onClick={() => setMobileOpen((value) => !value)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
          >
            {mobileOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
          {brand}
        </div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
    </header>

    <div className={`mx-auto grid max-w-[1920px] gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:gap-6 lg:px-8 ${expanded ? "lg:grid-cols-[248px_minmax(0,1fr)]" : "lg:grid-cols-[76px_minmax(0,1fr)]"}`}>
      <aside className="hidden min-h-[calc(100dvh-5rem)] self-stretch lg:flex lg:flex-col" aria-label="Landlord navigation">
        <div className={`flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card p-2 shadow-sm ${expanded ? "sm:p-2.5" : "p-2"}`}>
          <div className={`mb-1 flex min-h-10 items-center ${expanded ? "justify-between gap-2 px-2" : "justify-center"}`}>
            {expanded && <p className="m-0 min-w-0 truncate text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Landlord tools</p>}
            <button
              type="button"
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={expanded}
              title={expanded ? "Collapse sidebar" : "Expand sidebar"}
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {expanded ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
            </button>
          </div>
          <nav className="grid gap-1" aria-label="Landlord workspace">
            {renderLinks(expanded)}
          </nav>
          <div className="mt-auto border-t border-border/80 pt-3">
            <AppearanceControls expanded={expanded} />
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-5 sm:space-y-6">{children}</div>
    </div>

    <div className={`fixed inset-x-0 bottom-0 top-16 z-50 lg:hidden ${mobileOpen ? "visible" : "invisible pointer-events-none"}`}>
      <button
        type="button"
        aria-label="Close landlord navigation"
        tabIndex={mobileOpen ? 0 : -1}
        onClick={closeMobileNav}
        className={`absolute inset-0 size-full bg-foreground/25 backdrop-blur-[2px] transition-opacity duration-200 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        ref={mobileDrawerRef}
        id="landlord-mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileOpen}
        aria-label="Landlord workspace navigation"
        inert={!mobileOpen}
        tabIndex={-1}
        className={`relative z-10 flex h-full w-[min(84vw,20rem)] flex-col overflow-y-auto border-r border-border bg-card p-4 shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none sm:p-5 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <p className="m-0 mb-2 min-w-0 px-2 text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Landlord tools</p>
        <nav className="grid gap-1" aria-label="Landlord workspace">
          {renderLinks(true, true, true)}
        </nav>
        <div className="mt-auto border-t border-border/80 pt-4">
          <AppearanceControls expanded />
        </div>
      </aside>
    </div>
  </main>;
}
