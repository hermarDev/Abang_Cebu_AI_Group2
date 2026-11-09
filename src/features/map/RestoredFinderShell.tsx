"use client";

import { useEffect, useRef, useState } from "react";
import { FinderNavigation } from "./FinderNavigation";
import { getResolvedTheme, useFinderTheme } from "./useFinderTheme";
import type { RentalResult } from "@/contracts/preview";
import { SAMPLE_RENTALS } from "@/features/listings/preview-rentals";
import { formatPrice, searchPreviewRentals } from "@/features/rentals/search";
import { DEFAULT_RENTAL_FILTERS, type RentalFilters } from "@/contracts/rental-filters";
import { Skeleton } from "@/components/ui/Skeleton";
import { RentalFilterDialog } from "@/features/rentals/RentalFilterDialog";
import Image from "next/image";
import Link from "next/link";
import { FinderAssistant } from "./FinderAssistant";
import { Building2, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CircleAlert, Info, LogIn, LogOut, MapPinned, Menu, MessageSquare, Pencil, Search, User, X } from "lucide-react";
import { AccountAccessContent, type AccountMode } from "@/components/auth/AccountAccessContent";
import MapSearch from "@/components/map/MapSearch";
import type { PlaceResult } from "@/lib/search/places";
import MapCanvasLoader from "@/components/map/MapCanvasLoader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { notify } from "@/components/ui/AppToaster";
import { QuickFilters, propertyTypes } from "./FinderQuickFilters";
import { RentalCard } from "@/features/listings/RentalCard";
import { ListingInquiryModal } from "@/features/messages/ListingInquiryModal";
import { PropertyDetailsSheet } from "@/features/rentals/PropertyDetailsSheet";
import {
  formatCurfew,
  formatOccupancy,
  formatTenantPolicy,
} from "@/features/rentals/formatters";
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

let rentalsMemoryCache: { rentals: RentalResult[]; fetchedAt: number } | null = null;
const RENTALS_CACHE_TTL_MS = 60_000;
export function clearRentalsMemoryCache() { rentalsMemoryCache = null; }
const freshRentalsCache = () => rentalsMemoryCache && Date.now() - rentalsMemoryCache.fetchedAt < RENTALS_CACHE_TTL_MS ? rentalsMemoryCache : null;

export function ExpandedRentalModalContent({ rental, photoIndex, onPhotoIndexChange, canSave, saved, onToggleSaved, canMessage = false, onMessage }: { rental: RentalResult; photoIndex: number; onPhotoIndexChange: (index: number) => void; canSave: boolean; saved: boolean; onToggleSaved: (id: string) => void; canMessage?: boolean; onMessage?: (id: string) => void }) {
  const photos = rental.imageUrls ?? [];
  const safeIndex = Math.min(Math.max(photoIndex, 0), Math.max(photos.length - 1, 0));
  const specs = [
    rental.area > 0 && `${rental.area} sqm`,
    rental.maxOccupants && formatOccupancy(rental.maxOccupants),
    rental.bathroomType && `${rental.bathroomType} bathroom`,
    rental.tenantPolicy && `Tenant policy: ${formatTenantPolicy(rental.tenantPolicy)}`,
    rental.curfewType && `Curfew: ${formatCurfew(rental.curfewType)}`,
  ].filter(Boolean) as string[];
  return <div className={styles.expandedBody}>
    <div className={styles.expandedPhotoViewer}>
      {photos.length > 0 ? <>
        <Image src={photos[safeIndex]} alt={`Photo ${safeIndex + 1} of ${rental.title}`} width={1200} height={720} unoptimized className={styles.expandedPhoto} />
        <span className={styles.expandedCounter}>{safeIndex + 1} / {photos.length}</span>
        {photos.length > 1 && <>
          <button type="button" aria-label="Previous photo" className={`${styles.expandedPhotoNav} ${styles.expandedPrev}`} onClick={() => onPhotoIndexChange((safeIndex - 1 + photos.length) % photos.length)}><ChevronLeft size={20} aria-hidden="true" /></button>
          <button type="button" aria-label="Next photo" className={`${styles.expandedPhotoNav} ${styles.expandedNext}`} onClick={() => onPhotoIndexChange((safeIndex + 1) % photos.length)}><ChevronRight size={20} aria-hidden="true" /></button>
        </>}
      </> : <div className={styles.noPhoto}><Building2 size={22} aria-hidden="true" /><span>No photos provided</span></div>}
    </div>
    {photos.length > 1 && <div className={styles.expandedThumbs}>{photos.map((url, i) => <button key={url + i} type="button" aria-label={`Show photo ${i + 1}`} aria-current={i === safeIndex} onClick={() => onPhotoIndexChange(i)}><Image src={url} alt="" width={96} height={64} unoptimized /></button>)}</div>}
    <div className={styles.expandedMeta}>
      <span className={styles.category}>{propertyTypes.find(({ value }) => value === (rental.propertyType ?? rental.type))?.label ?? rental.type.replaceAll(/[-_]/g, " ")}</span>
      <span className={styles.verificationPill}>{rental.verificationStatus === "property_verified" ? "Verified property" : rental.verificationStatus === "unverified" ? "Pending verification" : rental.verificationStatus ? `${rental.verificationStatus.replaceAll("_", " ")} listing` : "Verification status unknown"}</span>
    </div>
    <p className={styles.price}>{formatPrice(rental.price)}<span> / month · per {rental.basis}</span></p>
    <p>{rental.address ?? rental.locality}</p>
    {rental.address && rental.address !== rental.locality && <p>{rental.locality}</p>}
    {specs.length > 0 && <ul className={styles.expandedSpecs} aria-label="Key specs">{specs.map((spec) => <li key={spec}>{spec}</li>)}</ul>}
    <p>{rental.description}</p>
    {rental.amenities.length > 0 && <ul className={styles.amenities} aria-label="Amenities">{rental.amenities.map((amenity, i) => <li key={amenity + "-" + i}>{amenity}</li>)}</ul>}
    {canSave && <button type="button" className={styles.expandedSave} aria-pressed={saved} onClick={() => onToggleSaved(rental.id)}>{saved ? "Remove from saved rentals" : "Save rental"}</button>}
    {canMessage && <button type="button" className={styles.expandedSave} onClick={() => onMessage?.(rental.id)}><MessageSquare size={16} aria-hidden="true" /> Message landlord</button>}
  </div>;
}

export function RestoredFinderShell({ rentalStatus: statusOverride, initialAccountMode, initialAccountOpen = false, isRecovery = false, statusMessage: initialStatusMessage, initialErrorMessage, authenticated = false, userRole = null, userId = null, displayName = null, avatarUrl = null }: { authenticated?: boolean; userRole?: UserRole | null; userId?: string | null; displayName?: string | null; avatarUrl?: string | null; rentalStatus?: "loading" | "error" | "ready"; initialAccountMode?: AccountMode; initialAccountOpen?: boolean; isRecovery?: boolean; statusMessage?: string; initialErrorMessage?: string }) {
  // Eager (not lazy) initial value: the test's useState mock does not invoke initializer functions.
  const cachedRentals = statusOverride === undefined ? freshRentalsCache() : null;
  const initialInventory = cachedRentals ? { status: "ready" as const, rentals: cachedRentals.rentals } : { status: "loading" as const, rentals: [] };
  const [inventory, setInventory] = useState<{ status: "loading" | "error" | "ready"; rentals: RentalResult[] }>(initialInventory);
  const [sampleMode, setSampleMode] = useState(false);
  const [assistantControlsTarget, setAssistantControlsTarget] = useState<HTMLDivElement | null>(null);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (statusOverride !== undefined || (request === 0 && freshRentalsCache())) return;
    const controller = new AbortController();
    async function loadRentals() {
      try {
        const response = await fetch("/api/rentals", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Rental read failed");
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" || !("rentals" in payload) || !Array.isArray(payload.rentals) || !payload.rentals.every((rental) =>
          rental && typeof rental.id === "string" && typeof rental.title === "string" && typeof rental.locality === "string" && typeof rental.type === "string" && typeof rental.description === "string" && typeof rental.available === "boolean" && Number.isFinite(rental.price) && Array.isArray(rental.coordinates) && rental.coordinates.length === 2 && rental.coordinates.every(Number.isFinite) && Array.isArray(rental.amenities) && rental.amenities.every((amenity: unknown) => typeof amenity === "string")
        )) throw new Error("Invalid rental response");
        if (!controller.signal.aborted) {
          rentalsMemoryCache = { rentals: payload.rentals, fetchedAt: Date.now() };
          setInventory({ status: "ready", rentals: payload.rentals });
        }
      } catch {
        if (!controller.signal.aborted) setInventory({ status: "error", rentals: [] });
      }
    }
    void loadRentals();
    return () => controller.abort();
  }, [statusOverride, request]);
  const favoriteOwner = authenticated && userRole === "renter" ? userId : null;
  const [favoriteState, setFavoriteState] = useState<{ owner: string | null; generation: number; ids: string[]; loaded: boolean; feedback: string | null }>({ owner: favoriteOwner, generation: 0, ids: [], loaded: false, feedback: null });
  if (favoriteState.owner !== favoriteOwner) setFavoriteState({ owner: favoriteOwner, generation: favoriteState.generation + 1, ids: [], loaded: false, feedback: null });
  const currentFavorites = favoriteOwner && favoriteState.owner === favoriteOwner ? favoriteState : null;
  const favoriteIds = currentFavorites?.ids ?? [];
  const favoritesLoaded = currentFavorites?.loaded ?? false;
  const favoriteFeedback = currentFavorites?.feedback ?? null;
  useEffect(() => {
    if (!favoriteOwner) return;
    const controller = new AbortController();
    const generation = favoriteState.generation;
    async function loadFavorites() {
      try {
        const response = await fetch("/api/favorites", { cache: "no-store", signal: controller.signal, headers: { "x-expected-user-id": favoriteOwner! } });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object" || !("favorites" in payload) || !Array.isArray(payload.favorites)) {
          throw new Error("Saved rentals could not be loaded.");
        }
        const ids = payload.favorites.flatMap((favorite) =>
          favorite && typeof favorite === "object" && "id" in favorite && typeof favorite.id === "string" ? [favorite.id] : []
        );
        if (!controller.signal.aborted) {
          setFavoriteState(current => current.owner === favoriteOwner && current.generation === generation ? { ...current, ids, loaded: true, feedback: null } : current);
        }
      } catch {
        if (!controller.signal.aborted) setFavoriteState(current => current.owner === favoriteOwner && current.generation === generation ? { ...current, ids: [], loaded: false, feedback: "Saved rental status could not be loaded. Reload the page and try again." } : current);
      }
    }
    void loadFavorites();
    return () => controller.abort();
  }, [favoriteOwner, favoriteState.generation]);
  const usingSamples = sampleMode;
  const rentalStatus = usingSamples ? "ready" : statusOverride ?? inventory.status;
  const rentals = usingSamples ? sampleRentals : statusOverride === undefined ? inventory.rentals : [];
  const [filters, setFilters] = useState<RentalFilters>(DEFAULT_RENTAL_FILTERS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(initialAccountOpen);
  const [accountMode, setAccountMode] = useState<AccountMode>(initialAccountMode ?? "sign-in");
  const accountBodyRef = useRef<HTMLDivElement>(null);
  const focusAccountHeading = useRef(false);
  useEffect(() => {
    if (focusAccountHeading.current) {
      focusAccountHeading.current = false;
      accountBodyRef.current?.querySelector<HTMLElement>("#account-heading")?.focus();
    }
  }, [accountMode]);
  const [accountPrompt, setAccountPrompt] = useState<string | null>(null);
  const [initialError, setInitialError] = useState<string | null>(initialErrorMessage ?? null);
  const favoriteRequests = useRef(new Set<string>());
  const [mapRadius, setMapRadius] = useState(2);
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("selected");
  });
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
  // Declared last so the test's slot-indexed useState/useEffect mocks keep their positions.
  const [expandedRentalId, setExpandedRentalId] = useState<string | null>(null);
  const [expandedPhotoIndex, setExpandedPhotoIndex] = useState(0);
  void expandedPhotoIndex;
  const [inquiryListingId, setInquiryListingId] = useState<string | null>(null);
  const [pendingInquiryId, setPendingInquiryId] = useState<string | null>(null);
  const openExpandedRental = (id: string) => { setSelectedRentalId(id); setExpandedPhotoIndex(0); setExpandedRentalId(id); };
  const expandedRental = rentals.find((item) => item.id === expandedRentalId) ?? visibleRentals.find((item) => item.id === expandedRentalId) ?? null;
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
      setExpandedRentalId(null);
      setDrawerOpen(false);
      setAccountMode("sign-in");
      setAccountPrompt("Sign in or create a renter account to save rentals to your list.");
      setAccountOpen(true);
      return;
    }
    if (!favoriteOwner || !favoritesLoaded) return;
    const generation = favoriteState.generation;
    const requestKey = `${generation}:${listingId}`;
    if (favoriteRequests.current.has(requestKey)) return;
    favoriteRequests.current.add(requestKey);
    const update = (change: (state: typeof favoriteState) => typeof favoriteState) => {
      setFavoriteState(current => current.owner === favoriteOwner && current.generation === generation ? change(current) : current);
    };
    const wasSaved = favoriteIds.includes(listingId);
    update(current => ({ ...current, feedback: null, ids: wasSaved ? current.ids.filter(id => id !== listingId) : [...current.ids, listingId] }));
    try {
      const response = await fetch("/api/favorites", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json", "x-expected-user-id": favoriteOwner },
        body: JSON.stringify({ listingId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const accountChanged = response.status === 409 && payload?.error === "Your account changed. Please refresh and try again.";
        throw new Error(accountChanged ? "Your account changed. Please refresh and try again." : "The saved rental could not be updated. Please try again.");
      }
      const successMessage = wasSaved ? "Rental removed from your saved list." : "Rental saved to your list.";
      update(current => ({ ...current, feedback: successMessage }));
      notify("success", `favorite-${listingId}`, successMessage);
    } catch (error) {
      const feedback = error instanceof Error && error.message === "Your account changed. Please refresh and try again."
        ? error.message : "The saved rental could not be updated. Please try again.";
      update(current => ({ ...current, ids: wasSaved
        ? current.ids.includes(listingId) ? current.ids : [...current.ids, listingId]
        : current.ids.filter(id => id !== listingId), feedback }));
      notify("error", `favorite-${listingId}`, feedback);
    } finally {
      favoriteRequests.current.delete(requestKey);
    }
  };
  const canMessageLandlord = !usingSamples && (!authenticated || userRole === "renter");
  const messageLandlord = (id: string) => {
    if (!canMessageLandlord) return;
    setExpandedRentalId(null);
    if (!authenticated) {
      setDrawerOpen(false);
      setSelectedRentalId(id);
      setPendingInquiryId(id);
      setAccountMode("sign-in");
      setAccountPrompt("Sign in or create a renter account to message the landlord.");
      setAccountOpen(true);
      return;
    }
    if (userId) setInquiryListingId(id);
  };
  // After sign-in the shell stays mounted: resume the exact listing the guest chose, or drop it for non-renters.
  if (pendingInquiryId && authenticated) {
    setPendingInquiryId(null);
    if (userRole === "renter" && userId && !usingSamples) setInquiryListingId(pendingInquiryId);
  }
  const inquiryRental = inquiryListingId ? rentals.find((item) => item.id === inquiryListingId) ?? null : null;
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

  return <main className={styles.app} data-nav-open={false} data-theme={activeTheme} data-results-hidden={resultsHidden} data-results-collapsed={resultsHidden} data-sheet-position={sheetPositions[sheetIndex]} style={{ "--results-sheet-height": sheetHeights[sheetIndex], "--mobile-sheet-peek-height": sheetHeights[sheetIndex] } as React.CSSProperties}><FinderNavigation authenticated={authenticated} userRole={userRole} userId={userId} open={drawerOpen} preference={preference} resolvedTheme={activeTheme} onPreferenceChange={setPreference} onClose={closeNavigation} onAccount={() => { setDrawerOpen(false); setAccountOpen(true); }} onHelp={() => { setDrawerOpen(false); setHelpOpen(true); }} /><div className={styles.workspace}><header className={styles.header}>
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
      <Link href="/account"><User size={17} aria-hidden="true" /><span>Account settings</span></Link>
      <Link href="/auth/logout"><LogOut size={17} aria-hidden="true" /><span>Log out</span></Link>
    </div>
  </details> : <button className={styles.signIn} aria-label="Open account dialog" onClick={() => setAccountOpen(true)}><LogIn size={19} aria-hidden="true" /><span>Log in</span></button>}
  <QuickFilters filters={filters} onChange={setFilters} onOpenFilters={() => setAdvancedOpen(true)} mapRadius={mapRadius} onRadiusChange={setMapRadius} />
  <div className={styles.mapStage}><div ref={mapViewport} className={styles.mapViewport}><MapCanvasLoader selectedRentalId={selectedRentalId} onSelectRental={revealRental} rentals={rentals} selectedPlace={selectedPlace} dataStatus={rentalStatus} filters={filters} onFiltersChange={setFilters} locationQuery={locationQuery} onLocationQueryChange={setLocationQuery} searchRadiusKm={mapRadius} onSearchRadiusKmChange={setMapRadius} onSearchCenterChange={setSearchCenter} resolvedTheme={activeTheme} assistantControlsTarget={assistantControlsTarget} savedRentalIds={favoriteIds} canSaveRentals={canSaveRentals} onToggleFavorite={toggleFavorite} onExpandRental={openExpandedRental} canMessageLandlord={canMessageLandlord} onMessageLandlord={messageLandlord} /></div>
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
        {favoriteFeedback && <p className={styles.favoriteFeedback} data-kind={favoriteFeedback.includes("saved to your list") || favoriteFeedback.includes("removed from your saved list") ? "success" : "error"} role={favoriteFeedback.includes("saved to your list") || favoriteFeedback.includes("removed from your saved list") ? "status" : "alert"}>{favoriteFeedback}</p>}
        {usingSamples && <div className={listingStyles.sampleNotice} role="status"><b>Sample data is on</b><p>Fictional, unverified rentals. These are not real offers.</p><button type="button" onClick={() => { setSampleMode(false); setSelectedRentalId(null); }}>Return to live data</button></div>}
        {rentalStatus === "loading" && <div className={listingStyles.loadingState} role="status"><div aria-hidden="true" data-testid="rental-loading-skeletons" className={listingStyles.skeletons}>{[0, 1, 2].map((index) => <div key={index} className={listingStyles.skeleton}><Skeleton className="h-24 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>)}</div><b>Loading rentals…</b><p>Checking the configured rental data service…</p><span className={listingStyles.srOnly}>Loading rentals…</span></div>}
        {rentalStatus === "error" ? <div className={listingStyles.emptyState} role="alert"><div className={listingStyles.emptyIcon}><Building2 size={24} aria-hidden="true" /></div><b>Couldn’t load rentals</b><p>{statusMessage}</p><div className={listingStyles.emptyActions}><button type="button" className={listingStyles.expandButton} onClick={() => setSampleMode(true)}><MapPinned size={16} aria-hidden="true" />Use sample data</button>{statusOverride === undefined && <button type="button" className={listingStyles.secondaryButton} onClick={() => { setInventory({ status: "loading", rentals: [] }); setRequest((value) => value + 1); }}>Try again</button>}</div></div>
          : rentalStatus === "ready" && visibleRentals.length === 0 ? <div className={listingStyles.emptyState}><div className={listingStyles.emptyIcon}><Building2 size={24} aria-hidden="true" /></div><b>{title}</b><p>{statusMessage}</p><div className={listingStyles.emptyActions}>{mapRadius < 5 && <button type="button" className={listingStyles.expandButton} onClick={() => setMapRadius(5)}><Search size={16} aria-hidden="true" />Expand search</button>}{!usingSamples && <button type="button" className={listingStyles.secondaryButton} onClick={() => setSampleMode(true)}><MapPinned size={16} aria-hidden="true" />Use sample data</button>}{!noInventory && <button type="button" className={listingStyles.linkButton} onClick={() => setFilters(DEFAULT_RENTAL_FILTERS)}>Clear filters</button>}</div></div>
            : rentalStatus === "ready" ? <ul className={`${styles.rentalList} ${listingStyles.rentalList}`}>{visibleRentals.map((rental) => <li key={rental.id}><RentalCard rental={rental} selected={selectedRentalId === rental.id} onSelect={setSelectedRentalId} saved={favoriteIds.includes(rental.id)} canSave={canSaveRentals} onToggleSaved={toggleFavorite} onExpand={openExpandedRental} canMessage={canMessageLandlord} onMessage={messageLandlord} /></li>)}</ul> : null}
      </div>
      <footer className={listingStyles.radiusFooter}><span>Search area: <b>{mapRadius} km radius</b></span><button type="button" aria-label="Edit search radius" onClick={() => setAdvancedOpen(true)}><span className={listingStyles.srOnly}>Edit search radius</span><Pencil size={16} aria-hidden="true" /></button></footer>
    </div>
  </div>
  {advancedOpen && <RentalFilterDialog filters={filters} open onOpenChange={setAdvancedOpen} onApply={setFilters} matchCount={visibleRentals.length} mapRadius={mapRadius} onMapRadiusChange={setMapRadius} getDraftCount={rentalStatus === "ready" ? (draft, radius) => searchPreviewRentals(rentals, { ...draft, radiusKm: radius }, "", searchCenter).length : undefined} />}
  <Modal surface="finder" open={accountOpen} onCloseAutoFocus={(event) => { event.preventDefault(); menuTrigger.current?.focus(); }} onClose={() => { setAccountOpen(false); setAccountPrompt(null); setPendingInquiryId(null); }} title="Account access" description={authenticated ? "Manage your profile and security." : "Log in or register to continue."} className={styles.accountDialog} hideTitle closeControl={<button type="button" aria-label="Close account dialog" className={styles.accountClose}><X size={18} aria-hidden="true" /></button>}>

    <div className={styles.accountHeader}>
      <Image src={activeTheme === "dark" ? "/icons/main_Logo_Light.png" : "/icons/main_Logo.png"} unoptimized alt="AbangCebu" width={299} height={100} loading="eager" />
    </div>
    <div ref={accountBodyRef} className={styles.accountBody}>
      {initialError && accountMode === "sign-in" && (
        <div className={styles.recoveryAlert} role="alert">
          <CircleAlert size={18} className="text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div className={styles.recoveryAlertBody}>
            <p className={styles.recoveryAlertTitle}>Password reset link expired or invalid</p>
            <p className={styles.recoveryAlertText}>{initialError}</p>
            <button
              type="button"
              className={styles.recoveryAlertAction}
              onClick={() => {
                focusAccountHeading.current = true;
                setAccountMode("reset");
                setInitialError(null);
              }}
            >
              Request a new password reset link &rarr;
            </button>
          </div>
        </div>
      )}
      {accountPrompt && (
        <div className={styles.accountPromptAlert} role="status">
          <Info size={16} className="text-action shrink-0" aria-hidden="true" />
          <span>{accountPrompt}</span>
        </div>
      )}
      {authenticated ? <section className={styles.accountContent}><h2 className={styles.accountHeading}>Your account</h2><p>Manage your profile and security.</p><div className="mt-5 grid gap-3"><Link href="/account" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action-hover">Account settings</Link><Link href="/auth/logout" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-card-foreground hover:bg-muted">Log out</Link></div></section> : <AccountAccessContent mode={accountMode} onModeChange={setAccountMode} isRecovery={isRecovery} statusMessage={initialStatusMessage} onLoginSuccess={() => { setAccountOpen(false); setAccountPrompt(null); setInitialError(null); }} />}
    </div>
    <div className={styles.accountFooter}>
      {accountMode === "sign-in" && !authenticated && <span>Don’t have an account? <button type="button" onClick={() => { focusAccountHeading.current = true; setAccountMode("sign-up"); setInitialError(null); }}>Register</button></span>}
      {accountMode === "sign-up" && !authenticated && <span>Already have an account? <button type="button" onClick={() => { focusAccountHeading.current = true; setAccountMode("sign-in"); setInitialError(null); }}>Log in</button></span>}
      <Button type="button" variant="ghost" className={styles.accountBack} onClick={() => { setAccountOpen(false); setAccountPrompt(null); setInitialError(null); setPendingInquiryId(null); }}>Continue browsing map</Button>
    </div>
  </Modal>
  {expandedRental && (
    <PropertyDetailsSheet
      open
      onClose={() => setExpandedRentalId(null)}
      rental={expandedRental}
      canSave={canSaveRentals}
      saved={favoriteIds.includes(expandedRental.id)}
      onToggleSaved={toggleFavorite}
      canMessage={canMessageLandlord}
      onMessage={messageLandlord}
    />
  )}
  {inquiryRental && userId && <ListingInquiryModal key={inquiryRental.id} listingId={inquiryRental.id} listingTitle={inquiryRental.title} userId={userId} surface="finder" onClose={() => setInquiryListingId(null)} />}
  {canUseRentalAssistant && !helpOpen && <button type="button" className={styles.chatLauncher} aria-label="Open rental assistant" title="Rental assistant" onClick={() => setHelpOpen(true)}><Image src="/icons/chatbot_logo.png" alt="" width={48} height={48} /></button>}
  {canUseRentalAssistant && helpOpen && <button type="button" className={styles.assistantBackdrop} style={{ backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }} aria-label="Close AbangCebu assistant" tabIndex={-1} onClick={() => setHelpOpen(false)} />}
  {canUseRentalAssistant && <FinderAssistant open={helpOpen} onOpenChange={setHelpOpen} onSearch={() => document.querySelector<HTMLInputElement>('input[role="combobox"]')?.focus()} onFilters={() => setAdvancedOpen(true)} onControlsTargetChange={setAssistantControlsTarget} onSignIn={() => { setHelpOpen(false); setAccountOpen(true); }} authenticated={authenticated} userId={userId} displayName={displayName} profilePhotoUrl={avatarUrl} />}</div></main>;
}
