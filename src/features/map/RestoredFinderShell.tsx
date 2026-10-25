"use client";

import { useEffect, useRef, useState } from "react";
import { FinderNavigation } from "./FinderNavigation";
import { useFinderTheme } from "./useFinderTheme";
import type { RentalResult } from "@/contracts/preview";
import { SAMPLE_RENTALS } from "@/features/listings/preview-rentals";
import { searchPreviewRentals } from "@/features/rentals/search";
import { DEFAULT_RENTAL_FILTERS, type RentalFilters } from "@/contracts/rental-filters";
import { Skeleton } from "@/components/ui/Skeleton";
import { RentalFilterDialog } from "@/features/rentals/RentalFilterDialog";
import Image from "next/image";
import Link from "next/link";
import { FinderAssistant } from "./FinderAssistant";
import { Menu, User } from "lucide-react";
import { AccountAccessContent, type AccountMode } from "@/components/auth/AccountAccessContent";
import MapSearch from "@/components/map/MapSearch";
import type { PlaceResult } from "@/lib/search/places";
import MapCanvasLoader from "@/components/map/MapCanvasLoader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { QuickFilters } from "./FinderQuickFilters";
import { RentalCard } from "@/features/listings/RentalCard";
import styles from "./RestoredFinderShell.module.css";

const sheetPositions = ["collapsed", "half", "expanded"] as const;
const sheetHeights = ["calc(64px + env(safe-area-inset-bottom))", "min(55dvh, calc(100dvh - 22rem))", "calc(100dvh - max(44px, env(safe-area-inset-bottom)))"];

const sampleRentals: RentalResult[] = SAMPLE_RENTALS.map((rental) => ({ ...rental, distanceMeters: null }));

export function RestoredFinderShell({ rentalStatus: statusOverride, initialAccountMode, initialAccountOpen = false, isRecovery = false, statusMessage: initialStatusMessage, initialErrorMessage }: { rentalStatus?: "loading" | "error" | "ready"; initialAccountMode?: AccountMode; initialAccountOpen?: boolean; isRecovery?: boolean; statusMessage?: string; initialErrorMessage?: string }) {
  const [inventory, setInventory] = useState<{ status: "loading" | "error" | "ready"; rentals: RentalResult[] }>({ status: "loading", rentals: [] });
  const [sampleMode, setSampleMode] = useState(false);
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
  const samplesAllowed = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  const usingSamples = samplesAllowed && sampleMode;
  const rentalStatus = usingSamples ? "ready" : statusOverride ?? inventory.status;
  const rentals = usingSamples ? sampleRentals : statusOverride === undefined ? inventory.rentals : [];
  const [filters, setFilters] = useState<RentalFilters>(DEFAULT_RENTAL_FILTERS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(initialAccountOpen);
  const [accountMode, setAccountMode] = useState<AccountMode>(initialAccountMode ?? "sign-in");
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
  const mapViewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", activeTheme === "dark");
    document.documentElement.classList.toggle("light", activeTheme === "light");
    document.documentElement.style.colorScheme = activeTheme;
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
  const noInventory = rentals.length === 0;
  const title = rentalStatus === "loading" ? "Loading rentals…" : rentalStatus === "error" ? "Couldn’t load rentals" : noInventory ? "No verified rentals here yet" : "No rentals match these filters";
  const statusMessage = rentalStatus === "loading" ? "Checking the configured rental data service…" : rentalStatus === "error" ? "Live listings could not be loaded. No sample properties are shown." : noInventory ? "Try expanding your search radius or browsing another area." : "Try clearing filters or expanding your search radius.";

  return <main className={styles.app} data-nav-open={false} data-theme={activeTheme} data-results-hidden={resultsHidden} data-results-collapsed={resultsHidden} data-sheet-position={sheetPositions[sheetIndex]} style={{ "--results-sheet-height": sheetHeights[sheetIndex], "--mobile-sheet-peek-height": sheetHeights[sheetIndex] } as React.CSSProperties}><FinderNavigation open={drawerOpen} preference={preference} resolvedTheme={activeTheme} onPreferenceChange={setPreference} onClose={closeNavigation} onAccount={() => { setDrawerOpen(false); setAccountOpen(true); }} onHelp={() => { setDrawerOpen(false); setHelpOpen(true); }} /><div className={styles.workspace}><header className={styles.header}>
    <button ref={menuTrigger} className={styles.iconButton} aria-label="Open menu" aria-expanded={drawerOpen} aria-controls="finder-navigation" onClick={() => setDrawerOpen((value) => !value)}><Menu size={21} /></button>
    <Link href="/" aria-label="AbangCebu home"><Image src={activeTheme === "dark" ? "/icons/main_Logo_Light.png" : "/icons/main_Logo.png"} unoptimized alt="AbangCebu" width={138} height={40} priority /></Link>
    <MapSearch className={styles.headerSearch} disabled={false} onSelect={setSelectedPlace} />
  </header>
  <button className={styles.signIn} aria-label="Open account dialog" onClick={() => setAccountOpen(true)}><User size={17} /><span>Log In</span></button>
  <QuickFilters filters={filters} onChange={setFilters} onOpenFilters={() => setAdvancedOpen(true)} mapRadius={mapRadius} onRadiusChange={setMapRadius} />
  <section className={styles.mapStage}><div ref={mapViewport} className={styles.mapViewport}><MapCanvasLoader selectedRentalId={selectedRentalId} onSelectRental={revealRental} rentals={rentals} selectedPlace={selectedPlace} dataStatus={rentalStatus} filters={filters} onFiltersChange={setFilters} locationQuery={locationQuery} onLocationQueryChange={setLocationQuery} searchRadiusKm={mapRadius} onSearchRadiusKmChange={setMapRadius} onSearchCenterChange={setSearchCenter} /></div>
    <button className={styles.resultsToggle} aria-label={resultsHidden ? "Show listings" : "Collapse listings"} aria-expanded={!resultsHidden} aria-controls="rental-results" onClick={() => setResultsHidden((value) => !value)}>{resultsHidden ? rentalStatus === "ready" ? `Show listings (${visibleRentals.length})` : "Show listings" : "Collapse listings"}</button>
    <div id="rental-results" className={styles.resultsRail} role="complementary" aria-label="Rental listings" aria-busy={rentalStatus === "loading"} hidden={resultsHidden} inert={!desktop && (drawerOpen || accountOpen || advancedOpen || resultsHidden) ? true : undefined}>
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
      <div className={styles.resultsHeader}><div><span className={styles.available}><i />{usingSamples ? "SAMPLE RENTALS" : "RENTALS IN CEBU"}</span><h1>Find rentals in Cebu</h1><p role="status">{rentalStatus === "loading" ? "Loading…" : rentalStatus === "error" ? "Listings unavailable" : `${visibleRentals.length} ${visibleRentals.length === 1 ? "listing" : "listings"} found${usingSamples ? " in sample data" : ""}`}</p></div></div>
      <div id="rental-results-content" hidden={!desktop && sheetIndex === 0} className={styles.resultsContent}>
      {rentalStatus === "loading" && <div aria-hidden="true" data-testid="rental-loading-skeletons" className="grid gap-3">{[0, 1, 2].map((index) => <div key={index} className="grid gap-3 rounded-lg border border-border p-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>)}</div>}
      {usingSamples && <div className={styles.inventoryState} role="status"><b>Sample data is on</b><p>These fictional rentals are for checking Area, Budget, Type, and Filters. They are not real offers.</p><button onClick={() => setSampleMode(false)}>Return to live data</button></div>}
      {rentalStatus !== "ready" || visibleRentals.length === 0 ? <div className={styles.inventoryState} role={rentalStatus === "error" ? "alert" : "status"}><b>{title}</b><p>{statusMessage}</p>{rentalStatus === "ready" && mapRadius < 5 && <button onClick={() => setMapRadius(5)}>Expand search</button>}{rentalStatus === "error" || (rentalStatus === "ready" && noInventory) ? <>{samplesAllowed && <button onClick={() => setSampleMode(true)}>Use sample data</button>}{rentalStatus === "error" && statusOverride === undefined && <button onClick={() => { setInventory({ status: "loading", rentals: [] }); setRequest((value) => value + 1); }}>Try again</button>}</> : rentalStatus === "ready" ? <button onClick={() => { setFilters(DEFAULT_RENTAL_FILTERS); }}>Clear filters</button> : null}</div> : <ul className={styles.rentalList}>{visibleRentals.map((rental) => <li key={rental.id}><RentalCard rental={rental} selected={selectedRentalId === rental.id} onSelect={setSelectedRentalId} /></li>)}</ul>}
      <p className={styles.radius}>Search area: {mapRadius} km radius</p>
      </div>
    </div>
  </section>
  {advancedOpen && <RentalFilterDialog filters={filters} open onOpenChange={setAdvancedOpen} onApply={setFilters} matchCount={visibleRentals.length} mapRadius={mapRadius} onMapRadiusChange={setMapRadius} getDraftCount={rentalStatus === "ready" ? (draft, radius) => searchPreviewRentals(rentals, { ...draft, radiusKm: radius }, "", searchCenter).length : undefined} />}
  <Modal surface="finder" open={accountOpen} onCloseAutoFocus={(event) => { event.preventDefault(); menuTrigger.current?.focus(); }} onClose={() => setAccountOpen(false)} title="Account access" description="Log in or register to continue." className={styles.accountDialog}>
    <div className={styles.accountBrand}><Image src={activeTheme === "dark" ? "/icons/main_Logo_Light.png" : "/icons/main_Logo.png"} unoptimized alt="AbangCebu" width={138} height={40} /></div>
    {initialErrorMessage && <p role="alert">{initialErrorMessage}</p>}
    <AccountAccessContent mode={accountMode} onModeChange={setAccountMode} isRecovery={isRecovery} statusMessage={initialStatusMessage} />
    <Button type="button" variant="ghost" className={styles.accountBack} onClick={() => setAccountOpen(false)}>Back to map</Button>
  </Modal>
  <button type="button" className={styles.chatLauncher} aria-label="Open rental assistant" title="Rental assistant" onClick={() => setHelpOpen(true)}><Image src="/icons/chatbot_logo.png" alt="" width={48} height={48} /></button>
  <FinderAssistant open={helpOpen} onOpenChange={setHelpOpen} onSearch={() => document.querySelector<HTMLInputElement>('input[role="combobox"]')?.focus()} onFilters={() => setAdvancedOpen(true)} /></div></main>;
}
