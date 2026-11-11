"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFinderTheme } from "@/features/map/useFinderTheme";
import { Building2, ChevronLeft, ChevronRight, Headset, HousePlus, LayoutDashboard, MapPinned, MessageSquare, UserRound } from "lucide-react";
import { LandlordMobileNav } from "@/features/landlord/LandlordMobileNav";
import { AppearanceControls } from "@/features/map/AppearanceControls";
import { useUnreadMessageCount } from "@/features/messages/useUnreadMessageCount";
import { NotificationBell } from "@/features/notifications/NotificationBell";

const linkGroups = [
  {
    label: "Workspace",
    links: [
      { href: "/landlord/dashboard#overview", label: "Overview", ariaLabel: "Overview", Icon: LayoutDashboard },
    ],
  },
  {
    label: "Property",
    links: [
      { href: "/landlord/properties", label: "My properties", ariaLabel: "My properties", Icon: Building2 },
      { href: "/list-property", label: "Add property", ariaLabel: "Add property", Icon: HousePlus },
      { href: "/landlord/map", label: "Property map", ariaLabel: "Property map", Icon: MapPinned },
    ],
  },
  {
    label: "Communication",
    links: [
      { href: "/landlord/messages", label: "Messages", ariaLabel: "Messages", Icon: MessageSquare },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/account", label: "Account settings", ariaLabel: "Account settings", Icon: UserRound },
    ],
  },
  {
    label: "Support",
    links: [
      { href: "mailto:support@abangcebu.ai", label: "Contact Support", ariaLabel: "Contact Support", Icon: Headset },
    ],
  },
];

type LandlordWorkspaceLayoutProps = {
  brand: ReactNode;
  actions: ReactNode;
  children: ReactNode;
  userId?: string | null;
  propertiesCount?: number | null;
};

function LandlordAppearanceControls({ expanded }: { expanded: boolean }) {
  const { preference, resolvedTheme, setPreference } = useFinderTheme();
  return <AppearanceControls preference={preference} resolvedTheme={resolvedTheme} onPreferenceChange={setPreference} expanded={expanded} />;
}
export function LandlordWorkspaceLayout({ brand, actions, children, userId = null, propertiesCount = null }: LandlordWorkspaceLayoutProps) {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessageCount(userId, Boolean(userId));
  const [expanded, setExpanded] = useState(true);
  const [activeHash, setActiveHash] = useState("#overview");

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash || "#overview");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const renderLinks = (isExpanded: boolean) => <div className="grid gap-4">
    {linkGroups.map(({ label: groupLabel, links: groupLinks }) => <section key={groupLabel} className="grid gap-1" aria-label={groupLabel}>
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
          prefetch={true}
          title={isExpanded ? undefined : label}
          aria-label={href === "/landlord/messages" && unreadCount > 0 ? `${label}, ${unreadCount} unread` : label}
          aria-current={isActive ? (hash ? "location" : "page") : undefined}
          className={`inline-flex min-h-12 items-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isExpanded ? "justify-start gap-3 px-3" : "justify-center px-0"} ${isActive ? "bg-action/10 font-semibold text-action" : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          <Icon size={19} className="shrink-0" aria-hidden="true" />
          {isExpanded && <span className="truncate">{label}</span>}
          {href === "/landlord/properties" && typeof propertiesCount === "number" && propertiesCount > 0 && (
            <span className={`rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-foreground ${isExpanded ? "ml-auto" : "sr-only"}`}>{propertiesCount}</span>
          )}
          {href === "/landlord/messages" && unreadCount > 0 && <span className={`rounded-full bg-action px-1.5 text-xs font-bold leading-5 text-action-foreground ${isExpanded ? "ml-auto" : "sr-only"}`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </Link>;
      })}
    </section>)}
  </div>;

  return <main className="min-h-[100dvh] bg-gradient-to-br from-action/5 via-background to-muted/70 pt-16 pb-20 pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground lg:pb-0">
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-lg">
      <div className="mx-auto flex min-h-16 max-w-[1920px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {brand}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell userId={userId} />
          {actions}
        </div>
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
            <LandlordAppearanceControls expanded={expanded} />
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-5 sm:space-y-6 pb-20 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
    </div>

    <LandlordMobileNav unreadCount={unreadCount} />
  </main>;
}