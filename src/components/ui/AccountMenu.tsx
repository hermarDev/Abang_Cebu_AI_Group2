"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/components/ui/cn";
import { LogoutLink } from "@/components/ui/LogoutLink";

export interface AccountMenuProps {
  displayName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  variant?: "header" | "sidebar";
  className?: string;
  onCloseDrawer?: () => void;
}

export function AccountMenu({
  displayName,
  avatarUrl,
  role,
  variant = "header",
  className,
  onCloseDrawer,
}: AccountMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (detailsRef.current?.hasAttribute("open") && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.removeAttribute("open");
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current?.hasAttribute("open")) {
        detailsRef.current.removeAttribute("open");
        detailsRef.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLinkClick = () => {
    onCloseDrawer?.();
    if (detailsRef.current) {
      detailsRef.current.removeAttribute("open");
    }
  };

  const formattedRole = role ? (role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()) : null;
  const labelText = displayName ? `Account options for ${displayName}` : "Account options";

  if (variant === "sidebar") {
    return (
      <details ref={detailsRef} className={cn("group relative w-full", className)}>
        <summary
          aria-haspopup="menu"
          aria-label={labelText}
          className="flex min-h-14 w-full cursor-pointer list-none items-center gap-3 rounded-2xl border border-border bg-card p-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
        >
          <Avatar key={avatarUrl ?? "fallback"} className="size-9 shrink-0 border border-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" className="size-full object-cover" /> : null}
            <AvatarFallback className="bg-action/10 text-action">
              <UserRound size={18} aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-sm font-semibold leading-tight text-foreground">
              {displayName || "Account"}
            </p>
            <p className="m-0 truncate text-xs capitalize text-muted-foreground">
              {formattedRole || "Renter"}
            </p>
          </div>
          <ChevronUp size={16} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="absolute bottom-[calc(100%+0.5rem)] inset-x-0 z-50 grid gap-1 rounded-xl border border-border bg-card p-1 text-card-foreground shadow-xl">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <Avatar key={avatarUrl ?? "fallback"} className="size-9 shrink-0 border border-border">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" className="size-full object-cover" /> : null}
              <AvatarFallback className="bg-action/10 text-action">
                <UserRound size={18} aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-semibold leading-tight text-foreground">
                {displayName || "Account"}
              </p>
              <span className="inline-block rounded-full bg-action/10 dark:bg-primary/10 px-2 py-0.5 text-xs font-semibold capitalize text-action dark:text-primary">
                {formattedRole || "Renter"}
              </span>
            </div>
          </div>
          <div className="my-1 h-px bg-border/80" role="separator" />
          <Link
            href="/account"
            onClick={handleLinkClick}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <UserRound size={17} aria-hidden="true" />
            <span>Account settings</span>
          </Link>
          <div className="my-1 h-px bg-border/80" role="separator" />
          <LogoutLink onClick={handleLinkClick} />
        </div>
      </details>
    );
  }

  return (
    <details ref={detailsRef} className={cn("group relative", className)}>
      <summary
        aria-haspopup="menu"
        aria-label={labelText}
        title={displayName || "Account"}
        className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
      >
        <Avatar key={avatarUrl ?? "fallback"} className="size-7 shrink-0 border border-border">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" className="size-full object-cover" /> : null}
          <AvatarFallback className="bg-action/10 text-action">
            <UserRound size={16} aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        <span>Account</span>
        <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 grid min-w-56 gap-1 rounded-xl border border-border bg-card p-1 text-card-foreground shadow-xl">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <Avatar key={avatarUrl ?? "fallback"} className="size-9 shrink-0 border border-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" className="size-full object-cover" /> : null}
            <AvatarFallback className="bg-action/10 text-action">
              <UserRound size={18} aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-sm font-semibold leading-tight text-foreground">
              {displayName || "Account"}
            </p>
            <span className="inline-block rounded-full bg-action/10 dark:bg-primary/10 px-2 py-0.5 text-xs font-semibold capitalize text-action dark:text-primary">
              {formattedRole || "Renter"}
            </span>
          </div>
        </div>
        <div className="my-1 h-px bg-border/80" role="separator" />
        <Link
          href="/account"
          onClick={handleLinkClick}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <UserRound size={17} aria-hidden="true" />
          <span>Account settings</span>
        </Link>
        <div className="my-1 h-px bg-border/80" role="separator" />
        <LogoutLink onClick={handleLinkClick} />
      </div>
    </details>
  );
}
