"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, Headset, HousePlus, LayoutDashboard, MapPinned, UserRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { AppearanceControls } from "@/features/map/AppearanceControls";
import { useFinderTheme } from "@/features/map/useFinderTheme";

const links = [
  { href: "/landlord/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/landlord/map", label: "Map", Icon: MapPinned },
  { href: "/list-property", label: "Add listing", accessible: "Listing form preview", Icon: HousePlus },
  { href: "/account", label: "Account", Icon: UserRound },
];

export function LandlordMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { preference, resolvedTheme, setPreference } = useFinderTheme();
  const itemClass = "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[.65rem] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return <>
    <nav aria-label="Landlord mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border bg-card px-1 pb-[env(safe-area-inset-bottom)] text-card-foreground lg:hidden">
      {links.map(({ href, label, accessible, Icon }) => <Link key={href} href={href} aria-label={accessible ?? label} aria-current={pathname === href ? "page" : undefined} className={`${itemClass} ${pathname === href ? "text-action" : "text-muted-foreground hover:text-foreground"}`}>
        <Icon size={20} aria-hidden="true" /><span>{label}</span>
      </Link>)}
      <button type="button" aria-label="More landlord options" aria-expanded={open} onClick={() => setOpen(true)} className={`${itemClass} text-muted-foreground hover:text-foreground`}><Ellipsis size={20} aria-hidden="true" /><span>More</span></button>
    </nav>
    <Modal open={open} onClose={() => setOpen(false)} title="More landlord options" className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <AppearanceControls preference={preference} resolvedTheme={resolvedTheme} onPreferenceChange={setPreference} expanded />
      <a href="mailto:support@abangcebu.ai" className="mt-4 flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Headset size={19} aria-hidden="true" />Contact support</a>
      <Link href="/auth/logout" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Log out</Link>
    </Modal>
  </>;
}
