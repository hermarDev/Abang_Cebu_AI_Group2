"use client";

import { useEffect, useRef, useState } from "react";
import { FinderNavigation } from "./FinderNavigation";
import { getResolvedTheme, useFinderTheme } from "./useFinderTheme";
import type { RentalResult } from "@/contracts/preview";
import { SAMPLE_RENTALS } from "@/features/listings/preview-rentals";
import { searchPreviewRentals } from "@/features/rentals/search";
import { DEFAULT_RENTAL_FILTERS, type RentalFilters } from "@/contracts/rental-filters";
import { Skeleton } from "@/components/ui/Skeleton";
import { RentalFilterDialog } from "@/features/rentals/RentalFilterDialog";
import Image from "next/image";
import Link from "next/link";
import { FinderAssistant } from "./FinderAssistant";
import { Building2, ChevronDown, ChevronsLeft, ChevronsRight, LogIn, LogOut, MapPinned, Menu, Pencil, Search, User, X } from "lucide-react";
import { AccountAccessContent, type AccountMode } from "@/components/auth/AccountAccessContent";
import MapSearch from "@/components/map/MapSearch";
import type { PlaceResult } from "@/lib/search/places";
import MapCanvasLoader from "@/components/map/MapCanvasLoader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { QuickFilters } from "./FinderQuickFilters";
import { RentalCard } from "@/features/listings/RentalCard";
import type { UserRole } from "@/types/database";
import listingStyles from "./FinderListings.module.css";
import styles from "./RestoredFinderShell.module.css";

const sheetPositions = ["collapsed", "half", "expanded"] as const;
const sheetHeights = ["calc(64px + env(safe-area-inset-bottom))", "min(26rem, 50dvh)", "calc(100dvh - max(44px, env(safe-area-inset-bottom)))"];

const sampleRentals: RentalResult[] = SAMPLE_RENTALS.map((rental) => ({ ...rental, verificationStatus: "unverified", distanceMeters: null }));
const listingCategories = [
  { id: "all", label: "All", types: [] as RentalFilters["propertyTypes"] },
  { id: "rooms", label: "Rooms", types: ["private_room", "bedspace", "boarding_house", "shared_room"] as RentalFilters["propertyTypes"] },
  { id: "apartments", label: "Apartments", types: ["studio", "apartment", "condo"] as RentalFilters["propertyTypes"] },
  { id: "houses", label: "Houses", types: ["house"] as RentalFilters["propertyTypes"] },
];

export function RestoredFinderShell({ rentalStatus: statusOverride, initialAccountMode, initialAccountOpen = false, isRecovery = false, statusMessage: initialStatusMessage, initialErrorMessage, authenticated = false, userRole = null, userId = null, displayName = null, avatarUrl = null }: { authenticated?: boolean; userRole?: UserRole | null; userId?: string | null; displayName?: string | null; avatarUrl?: string | null; rentalStatus?: "loading" | "error" | "ready"; initialAccountMode?: AccountMode; initialAccountOpen?: boolean; isRecovery?: boolean; statusMessage?: string; initialErrorMessage?: string }) {
  const [inventory, setInventory] = useState<{ status: "loading" | "error" | "ready"; rentals: RentalResult[] }>({ status: "loading", rentals: [] });
  const [sampleMode, setSampleMode] = useState(false);
  const [assistantControlsTarget, setAssistantControlsTarget] = useState<HTMLDivElement | null>(null);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (statusOverride !== undefined) return;
    const controller = new AbortController();
    async function loadRentals() {
      try {
        const response = await fetch("/api/rentals", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Rental read failed");
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" || !("rentals" in payload) || !Array.isArray(payload.rentals) || !payload.rentals.every((rental) =>
          rental && typeof rental.id === "string" && typeof rental.title === "string" && typeof rental.locality === "string" && typeof rental.type === "string" && typeof rental.description === "string" && typeof rental.available === "boolean" && Number.isFinite(rental.price) && Array.isArray(rental.coordinates) && rental.coordinates.length === 2 && rental.coordinates.every(Number.isFinite) && Array.isArray(rental.amenities) && rental.amenities.every((amenity: unknown) => typeof amenity === "string")
        )) throw new Error("Invalid rental response");
        if (!controller.signal.aborted) setInventory({ status: "ready", rentals: payload.rentals });
      } catch {
        if (!controller.signal.aborted) setInventory({ status: "error", rentals: [] });
      }
    }
    void loadRentals();
    return () => controller.abort();
  }, [statusOverride, request]);
  useEffect(() => {
    if (!authenticated || userRole !== "renter") return;
    const controller = new AbortController();
    async function loadFavorites() {
      try {
        const response = await fetch("/api/favorites", { cache: "no-store", signal: controller.signal });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object" || !("favorites" in payload) || !Array.isArray(payload.favorites)) {
          throw new Error("Saved rentals could not be loaded.");
        }
        const ids = payload.favorites.flatMap((favorite) =>
          favorite && typeof favorite === "object" && "id" in favorite && typeof favorite.id === "string" ? [favorite.id] : []
        );
        if (!controller.signal.aborted) setFavoriteIds(ids);
      } catch {
        if (!controller.signal.aborted) setFavoriteFeedback("Saved rental status could not be loaded. Reload the page and try again.");
      } finally {
        if (!controller.signal.aborted) setFavoritesLoaded(true);
      }
    }
    void loadFavorites();
    return () => controller.abort();
  }, [authenticated, userRole]);
  const usingSamples = sampleMode;
  const rentalStatus = usingSamples ? "ready" : statusOverride ?? inventory.status;
  const rentals = usingSamples ? sampleRentals : statusOverride === undefined ? inventory.rentals : [];
  const [filters, setFilters] = useState<RentalFilters>(DEFAULT_RENTAL_FILTERS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(initialAccountOpen);
  const [accountMode, setAccountMode] = useState<AccountMode>(initialAccountMode ?? "sign-in");
  const [accountPrompt, setAccountPrompt] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(!(authenticated && userRole === "renter"));
  const [favoriteFeedback, setFavoriteFeedback] = useState<string | null>(null);
  const favoriteRequests = useRef(new Set<string>());
  const [mapRadius, setMapRadius] = useState(2);
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searchCenter, setSearchCenter] = useState<[number, number]>([123.8854, 10.3157]);
  const visibleRentals = searchPreviewRentals(rentals, { ...filters, radiusKm: mapRadius }, "", searchCenter);
  const [desktop, setDesktop] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);
  const index = useRef(sheetIndex);
  const sheetDrag = useRef<{ id: number; y: number } | null>(null);
  const [resultsHidden, setResultsHidden] = useState(false);
  const { preference, resolvedTheme: activeTheme, setPreference } = useFinderTheme();
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const resultsToggle = useRef<HTMLButtonElement>(null);
  const collapseTrigger = useRef<HTMLButtonElement>(null);
  const mapViewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    // Hydration's server snapshot is light; resolve the client preference before touching the root.
    const theme = getResolvedTheme();
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.style.colorScheme = theme;
  }, [activeTheme]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const viewport = mapViewport.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;
    // MapLibre tracks window resize; notify only when its container changes size.
    const observer = new ResizeObserver(() => window.dispatchEvent(new Event("resize")));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!helpOpen) return;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-label="AbangCebu assistant"] button[aria-label="Close chat"]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [helpOpen]);
  const moveSheetTo = (next: number) => {
    const bounded = Math.max(0, Math.min(2, next));
    index.current = bounded;
    setSheetIndex(bounded);
  };
  const revealRental = (id: string) => {
    setSelectedRentalId(id);
    setResultsHidden(false);
    moveSheetTo(Math.max(1, index.current));
    requestAnimationFrame(() => {
      const card = document.getElementById(`rental-card-${id}`);
      card?.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  };
  const closeNavigation = () => { setDrawerOpen(false); menuTrigger.current?.focus(); };
  const toggleFavorite = async (listingId: string) => {
    if (!authenticated) {
      setDrawerOpen(false);
      setAccountMode("sign-in");
      setAccountPrompt("Sign in or create a renter account to save rentals to your list.");
      setAccountOpen(true);
      return;
    }
    if (userRole !== "renter" || favoriteRequests.current.has(listingId)) return;

    favoriteRequests.current.add(listingId);
    setFavoriteFeedback(null);
    const wasSaved = favoriteIds.includes(listingId);
    setFavoriteIds((current) => wasSaved ? current.filter((id) => id !== listingId) : [...current, listingId]);
    try {
      const response = await fetch("/api/favorites", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (!response.ok) throw new Error("The saved rental could not be updated.");
      setFavoriteFeedback(wasSaved ? "Rental removed from your saved list." : "Rental saved to your list.");
    } catch {
      setFavoriteIds((current) => wasSaved
        ? current.includes(listingId) ? current : [...current, listingId]
        : current.filter((id) => id !== listingId));
      setFavoriteFeedback("The saved rental could not be updated. Please try again.");
    } finally {
      favoriteRequests.current.delete(listingId);
    }
  };
  const canSaveRentals = !usingSamples && (!authenticated || userRole === "renter") && (!authenticated || favoritesLoaded);
  const noInventory = rentals.length === 0;
  const canUseRentalAssistant = !authenticated || userRole === "renter";
  const title = rentalStatus === "loading" ? "Loading rentals…" : rentalStatus === "error" ? "Couldn’t load rentals" : noInventory ? "No rentals found" : "No rentals match these filters";
  const statusMessage = rentalStatus === "loading" ? "Checking the configured rental data service…" : rentalStatus === "error" ? "Live listings could not be loaded. No sample properties are shown." : noInventory ? "Try adjusting your search, expanding the search area, or browsing another location." : "Try clearing filters or expanding your search radius.";
  const changeCategory = (category: typeof listingCategories[number]) => {
    setFilters((current) => ({ ...current, propertyTypes: category.types }));
  };
  const selectedCategory = listingCategories.find(({ types }) => types.length === filters.propertyTypes.length && types.every((type) => filters.propertyTypes.includes(type)))?.id ?? "custom";
  const collapseListings = () => {
    setResultsHidden(true);
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resultsToggle.current?.focus());
  };
  const expandListings = () => {
    setResultsHidden(false);
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => collapseTrigger.current?.focus());
  };

  return <main className={styles.app} data-nav-open={false} data-theme={activeTheme} data-results-hidden={resultsHidden} data-results-collapsed={resultsHidden} data-sheet-position={sheetPositions[sheetIndex]} style={{ "--results-sheet-height": sheetHeights[sheetIndex], "--mobile-sheet-peek-height": sheetHeights[sheetIndex] } as React.CSSProperties}><FinderNavigation authenticated={authenticated} userRole={userRole} open={drawerOpen} preference={preference} resolvedTheme={activeTheme} onPreferenceChange={setPreference} onClose={closeNavigation} onAccount={() => { setDrawerOpen(false); setAccountOpen(true); }} onHelp={() => { setDrawerOpen(false); setHelpOpen(true); }} /><div className={styles.workspace}><header className={styles.header}>
    <button ref={menuTrigger} className={styles.iconButton} aria-label="Open menu" aria-expanded={drawerOpen} aria-controls="finder-navigation" onClick={() => setDrawerOpen((value) => !value)}><Menu size={21} /></button>
    <Link href="/" aria-label="AbangCebu home"><Image src={activeTheme === "dark" ? "/icons/main_Logo_Light.png" : "/icons/main_Logo.png"} unoptimized alt="AbangCebu" width={299} height={100} loading="eager" style={{ height: "auto" }} /></Link>
    <MapSearch className={styles.headerSearch} disabled={false} onSelect={setSelectedPlace} />
  </header>
  {authenticated ? <details className={styles.accountMenu}>
    <summary className={styles.signIn} aria-label={displayName ? `Account options for ${displayName}` : "Account options"}>
      {avatarUrl
        ? <Image src={avatarUrl} alt="" width={28} height={28} unoptimized className={styles.accountAvatar} />
        : <User size={17} aria-hidden="true" />}
      <span>Account</span><ChevronDown size={15} aria-hidden="true" />
    </summary>
    <div className={styles.accountMenuPopover}>
      <Link href="/account"><User size={17} aria-hidden="true" /><span>Manage account</span></Link>
      <Link href="/auth/logout"><LogOut size={17} aria-hidden="true" /><span>Sign out</span></Link>
    </div>
  </details> : <button className={styles.signIn} aria-label="Open account dialog" onClick={() => setAccountOpen(true)}><LogIn size={19} aria-hidden="true" /><span>Log in</span></button>}
  <QuickFilters filters={filters} onChange={setFilters} onOpenFilters={() => setAdvancedOpen(true)} mapRadius={mapRadius} onRadiusChange={setMapRadius} />
  <div className={styles.mapStage}><div ref={mapViewport} className={styles.mapViewport}><MapCanvasLoader selectedRentalId={selectedRentalId} onSelectRental={revealRental} rentals={rentals} selectedPlace={selectedPlace} dataStatus={rentalStatus} filters={filters} onFiltersChange={setFilters} locationQuery={locationQuery} onLocationQueryChange={setLocationQuery} searchRadiusKm={mapRadius} onSearchRadiusKmChange={setMapRadius} onSearchCenterChange={setSearchCenter} resolvedTheme={activeTheme} assistantControlsTarget={assistantControlsTarget} savedRentalIds={favoriteIds} canSaveRentals={canSaveRentals} onToggleFavorite={toggleFavorite} /></div>
    <div className={listingStyles.sampleMapNotice} role="status" hidden={!usingSamples}><b>SAMPLE RENTALS · NOT REAL OFFERS</b><button type="button" onClick={() => { setSampleMode(false); setSelectedRentalId(null); }}>Return to live data</button></div>
    <button ref={resultsToggle} className={`${styles.resultsToggle} ${listingStyles.reopenButton}`} aria-label="Show listings" aria-expanded={!resultsHidden} aria-controls="rental-results" onClick={expandListings}><ChevronsRight size={17} aria-hidden="true" />Listings{rentalStatus === "ready" && <span>{visibleRentals.length}</span>}</button>
    <div id="rental-results" className={`${styles.resultsRail} ${listingStyles.panel}`} role="complementary" aria-label="Rental listings" aria-busy={rentalStatus === "loading"} hidden={resultsHidden} inert={!desktop && (drawerOpen || accountOpen || advancedOpen || resultsHidden) ? true : undefined}>
      <div className={styles.sheetControls}>
        <button type="button" className={styles.sheetAction} aria-expanded={sheetIndex > 0} aria-controls="rental-results-content" onClick={() => moveSheetTo(sheetIndex === 0 ? 1 : 0)}>{sheetIndex > 0 ? "Back to map" : rentalStatus === "loading" ? "Show listings" : rentalStatus === "error" ? "Listings unavailable" : `Show listings (${visibleRentals.length})`}</button>
        <div role="slider" tabIndex={0} aria-label="Adjust results sheet" aria-valuemin={0} aria-valuemax={2} aria-valuenow={sheetIndex} aria-valuetext={sheetPositions[sheetIndex]} aria-orientation="vertical" aria-controls="rental-results" className={styles.sheetHandle}
          onKeyDown={(event) => {
            if (event.key === "Home") { event.preventDefault(); moveSheetTo(0); }
            if (event.key === "End") { event.preventDefault(); moveSheetTo(2); }
            if (event.key === "ArrowDown") { event.preventDefault(); moveSheetTo(index.current - 1); }
            if (event.key === "ArrowUp") { event.preventDefault(); moveSheetTo(index.current + 1); }
          }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            sheetDrag.current = { id: event.pointerId, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            const drag = sheetDrag.current;
            sheetDrag.current = null;
            if (drag?.id === event.pointerId && Math.abs(drag.y - event.clientY) >= 40) {
              const distance = Math.abs(drag.y - event.clientY);
              const steps = distance >= 120 ? 2 : 1;
              moveSheetTo(index.current + (drag.y > event.clientY ? steps : -steps));
            }
          }}
          onPointerCancel={() => { sheetDrag.current = null; }}
          onLostPointerCapture={() => { sheetDrag.current = null; }}><span aria-hidden="true" /></div>
      </div>
      <header className={listingStyles.header}>
        <div className={listingStyles.headingRow}><div className={listingStyles.headingAndCount}><h1>Listings</h1><span className={listingStyles.countBadge} aria-label={rentalStatus === "ready" ? `${visibleRentals.length} listings` : rentalStatus === "loading" ? "Listings loading" : "Listings unavailable"}>{rentalStatus === "ready" ? visibleRentals.length : "—"}</span></div>
          <button ref={collapseTrigger} type="button" className={listingStyles.collapseButton} aria-label="Collapse listings" aria-expanded={!resultsHidden} aria-controls="rental-results" onClick={collapseListings}><ChevronsLeft size={18} aria-hidden="true" /></button>
        </div>
        <nav className={listingStyles.categories} aria-label="Rental categories">{listingCategories.map((category) => <button key={category.id} type="button" aria-pressed={selectedCategory === category.id} className={selectedCategory === category.id ? listingStyles.categoryActive : listingStyles.categoryButton} onClick={() => changeCategory(category)}>{category.label}</button>)}</nav>
        {rentalStatus !== "loading" && rentalStatus !== "error" && <p className={listingStyles.resultsStatus} role="status">{`${visibleRentals.length} ${visibleRentals.length === 1 ? "listing" : "listings"} found${usingSamples ? " · sample data" : ""}`}</p>}
      </header>
      <div id="rental-results-content" hidden={!desktop && sheetIndex === 0} className={`${styles.resultsContent} ${listingStyles.content}`}>
        {favoriteFeedback && <p className={styles.favoriteFeedback} role="status">{favoriteFeedback}</p>}
        {usingSamples && <div className={listingStyles.sampleNotice} role="status"><b>Sample data is on</b><p>Fictional, unverified rentals. These are not real offers.</p><button type="button" onClick={() => { setSampleMode(false); setSelectedRentalId(null); }}>Return to live data</button></div>}
        {rentalStatus === "loading" && <div className={listingStyles.loadingState} role="status"><div aria-hidden="true" data-testid="rental-loading-skeletons" className={listingStyles.skeletons}>{[0, 1, 2].map((index) => <div key={index} className={listingStyles.skeleton}><Skeleton className="h-24 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>)}</div><b>Loading rentals…</b><p>Checking the configured rental data service…</p><span className={listingStyles.srOnly}>Loading rentals…</span></div>}
        {rentalStatus === "error" ? <div className={listingStyles.emptyState} role="alert"><div className={listingStyles.emptyIcon}><Building2 size={24} aria-hidden="true" /></div><b>Couldn’t load rentals</b><p>{statusMessage}</p><div className={listingStyles.emptyActions}><button type="button" className={listingStyles.expandButton} onClick={() => setSampleMode(true)}><MapPinned size={16} aria-hidden="true" />Use sample data</button>{statusOverride === undefined && <button type="button" className={listingStyles.secondaryButton} onClick={() => { setInventory({ status: "loading", rentals: [] }); setRequest((value) => value + 1); }}>Try again</button>}</div></div>
          : rentalStatus === "ready" && visibleRentals.length === 0 ? <div className={listingStyles.emptyState}><div className={listingStyles.emptyIcon}><Building2 size={24} aria-hidden="true" /></div><b>{title}</b><p>{statusMessage}</p><div className={listingStyles.emptyActions}>{mapRadius < 5 && <button type="button" className={listingStyles.expandButton} onClick={() => setMapRadius(5)}><Search size={16} aria-hidden="true" />Expand search</button>}{!usingSamples && <button type="button" className={listingStyles.secondaryButton} onClick={() => setSampleMode(true)}><MapPinned size={16} aria-hidden="true" />Use sample data</button>}{!noInventory && <button type="button" className={listingStyles.linkButton} onClick={() => setFilters(DEFAULT_RENTAL_FILTERS)}>Clear filters</button>}</div></div>
            : rentalStatus === "ready" ? <ul className={`${styles.rentalList} ${listingStyles.rentalList}`}>{visibleRentals.map((rental) => <li key={rental.id}><RentalCard rental={rental} selected={selectedRentalId === rental.id} onSelect={setSelectedRentalId} saved={favoriteIds.includes(rental.id)} canSave={canSaveRentals} onToggleSaved={toggleFavorite} /></li>)}</ul> : null}
      </div>
      <footer className={listingStyles.radiusFooter}><span>Search area: <b>{mapRadius} km radius</b></span><button type="button" aria-label="Edit search radius" onClick={() => setAdvancedOpen(true)}><span className={listingStyles.srOnly}>Edit search radius</span><Pencil size={16} aria-hidden="true" /></button></footer>
    </div>
  </div>
  {advancedOpen && <RentalFilterDialog filters={filters} open onOpenChange={setAdvancedOpen} onApply={setFilters} matchCount={visibleRentals.length} mapRadius={mapRadius} onMapRadiusChange={setMapRadius} getDraftCount={rentalStatus === "ready" ? (draft, radius) => searchPreviewRentals(rentals, { ...draft, radiusKm: radius }, "", searchCenter).length : undefined} />}
  <Modal surface="finder" open={accountOpen} onCloseAutoFocus={(event) => { event.preventDefault(); menuTrigger.current?.focus(); }} onClose={() => { setAccountOpen(false); setAccountPrompt(null); }} title="Account access" description={authenticated ? "Manage your profile and security." : "Log in or register to continue."} className={styles.accountDialog} hideTitle closeControl={<button type="button" aria-label="Close account dialog" className={styles.accountClose}><X size={18} aria-hidden="true" /></button>}>

    <div className={styles.accountHeader}>
      <Image src={activeTheme === "dark" ? "/icons/main_Logo_Light.png" : "/icons/main_Logo.png"} unoptimized alt="AbangCebu" width={299} height={100} loading="eager" />
    </div>
    <div className={styles.accountBody}>
      {(initialErrorMessage || accountPrompt) && <p role={initialErrorMessage ? "alert" : "status"}>{initialErrorMessage ?? accountPrompt}</p>}
      {authenticated ? <section className={styles.accountContent}><h2 className={styles.accountHeading}>Your account</h2><p>Manage your profile and security.</p><div className="mt-5 grid gap-3"><Link href="/account" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action-hover">Manage account</Link><Link href="/auth/logout" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-card-foreground hover:bg-muted">Sign out</Link></div></section> : <AccountAccessContent mode={accountMode} onModeChange={setAccountMode} isRecovery={isRecovery} statusMessage={initialStatusMessage} />}
    </div>
    <div className={styles.accountFooter}>
      {accountMode === "sign-up" && !authenticated && <span>Already have an account? <button type="button" onClick={() => setAccountMode("sign-in")}>Log in</button></span>}
      <Button type="button" variant="ghost" className={styles.accountBack} onClick={() => setAccountOpen(false)}>Continue browsing map</Button>
    </div>
  </Modal>
  {canUseRentalAssistant && !helpOpen && <button type="button" className={styles.chatLauncher} aria-label="Open rental assistant" title="Rental assistant" onClick={() => setHelpOpen(true)}><Image src="/icons/chatbot_logo.png" alt="" width={48} height={48} /></button>}
  {canUseRentalAssistant && helpOpen && <button type="button" className={styles.assistantBackdrop} style={{ backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }} aria-label="Close AbangCebu assistant" tabIndex={-1} onClick={() => setHelpOpen(false)} />}
  {canUseRentalAssistant && <FinderAssistant open={helpOpen} onOpenChange={setHelpOpen} onSearch={() => document.querySelector<HTMLInputElement>('input[role="combobox"]')?.focus()} onFilters={() => setAdvancedOpen(true)} onControlsTargetChange={setAssistantControlsTarget} onSignIn={() => { setHelpOpen(false); setAccountOpen(true); }} authenticated={authenticated} userId={userId} displayName={displayName} profilePhotoUrl={avatarUrl} />}</div></main>;
}
