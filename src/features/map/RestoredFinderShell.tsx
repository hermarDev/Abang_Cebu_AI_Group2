"use client";

import { useEffect, useState } from "react";
import type { RentalResult } from "@/contracts/preview";
import { SAMPLE_RENTALS } from "@/features/listings/preview-rentals";
import { formatPrice, searchPreviewRentals } from "@/features/rentals/search";
import { DEFAULT_RENTAL_FILTERS, type RentalFilters, type PropertyType } from "@/contracts/rental-filters";
import { RentalFilterDialog } from "@/features/rentals/RentalFilterDialog";
import Image from "next/image";
import Link from "next/link";
import { Building2, Bookmark, Compass, HelpCircle, Menu, MessageCircle, PlusCircle, Send, User, X } from "lucide-react";
import { AccountAccessContent } from "@/components/auth/AccountAccessContent";
import MapSearch from "@/components/map/MapSearch";
import type { PlaceResult } from "@/lib/search/places";
import MapCanvasLoader from "@/components/map/MapCanvasLoader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import styles from "./RestoredFinderShell.module.css";

const sampleRentals: RentalResult[] = SAMPLE_RENTALS.map((rental) => ({ ...rental, distanceMeters: null }));

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "private_room", label: "Private room" }, { value: "bedspace", label: "Bedspace" },
  { value: "boarding_house", label: "Boarding house" }, { value: "shared_room", label: "Shared room" },
  { value: "studio", label: "Studio" }, { value: "apartment", label: "Apartment" },
  { value: "condo", label: "Condo" }, { value: "house", label: "House" },
];

const budgetOptions: { value: number | null; label: string }[] = [
  { value: null, label: "Any maximum" }, { value: 2500, label: "Up to ₱2,500" },
  { value: 3500, label: "Up to ₱3,500" }, { value: 5000, label: "Up to ₱5,000" },
  { value: 8000, label: "Up to ₱8,000" },
];

function QuickFilters({ filters, onChange, onOpenFilters, mapRadius, onRadiusChange }: { filters: RentalFilters; onChange: (filters: RentalFilters) => void; onOpenFilters: () => void; mapRadius: number; onRadiusChange: (radius: number) => void }) {
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState<number | null>(filters.maxPrice ?? null);
  const [typeDraft, setTypeDraft] = useState<PropertyType[]>(filters.propertyTypes);
  const activeCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "propertyTypes" || key === "furnishingTypes") return Array.isArray(value) && value.length > 0;
    if (key === "minPrice" || key === "maxPrice") return value !== null && value !== undefined;
    return value === true || (value !== null && value !== undefined && value !== false && value !== "any");
  }).length;
  const budgetSummary = filters.maxPrice == null ? "Any" : filters.maxPrice % 1000 === 0 ? `≤ ₱${filters.maxPrice / 1000}k` : `≤ ₱${(filters.maxPrice / 1000).toFixed(1)}k`;
  const typeSummary = filters.propertyTypes.length === 0 ? "Any" : filters.propertyTypes.length === 1 ? propertyTypes.find((item) => item.value === filters.propertyTypes[0])?.label : `${filters.propertyTypes.length} types`;

  return <div className={styles.quickFilters} role="group" aria-label="Rental search filters">
    <label className={styles.areaControl}><span>Area</span><select aria-label="Search area radius" value={mapRadius} onChange={(event) => onRadiusChange(Number(event.target.value))}><option value={1}>1 km radius</option><option value={2}>2 km radius</option><option value={5}>5 km radius</option></select></label>
    <button type="button" onClick={() => { setBudgetDraft(filters.maxPrice ?? null); setBudgetOpen(true); }} aria-label={`Budget, ${filters.maxPrice == null ? "any maximum" : `up to ${filters.maxPrice.toLocaleString("en-PH")} pesos`}`}><span>Budget</span><b>{budgetSummary}</b></button>
    <button type="button" onClick={() => { setTypeDraft(filters.propertyTypes); setTypeOpen(true); }} aria-label={`Property type, ${typeSummary}`}><span>Type</span><b>{typeSummary}</b></button>
    <button type="button" onClick={onOpenFilters} aria-label={`All filters${activeCount ? `, ${activeCount} active` : ""}`}><span>Filters</span><b>{activeCount || "All"}</b></button>
    <Modal surface="finder" open={budgetOpen} onClose={() => setBudgetOpen(false)} title="Maximum monthly rent" description="Choose a budget ceiling for your search." className={styles.choiceDialog}>
      <form onSubmit={(event) => { event.preventDefault(); onChange({ ...filters, maxPrice: budgetDraft }); setBudgetOpen(false); }}>
        <fieldset className={styles.choiceList}><legend className="sr-only">Monthly rent budget</legend>{budgetOptions.map((option) => <label key={option.value ?? "any"}><input type="radio" name="budget" checked={budgetDraft === option.value} onChange={() => setBudgetDraft(option.value)} /><span>{option.label}</span></label>)}</fieldset>
        <div className={styles.modalActions}><Button type="button" variant="outline" onClick={() => setBudgetOpen(false)}>Cancel</Button><Button type="submit">Apply budget</Button></div>
      </form>
    </Modal>
    <Modal surface="finder" open={typeOpen} onClose={() => setTypeOpen(false)} title="Property type" description="Select one or more rental categories." className={styles.choiceDialog}>
      <form onSubmit={(event) => { event.preventDefault(); onChange({ ...filters, propertyTypes: typeDraft }); setTypeOpen(false); }}>
        <fieldset className={styles.typeList}><legend className={styles.legendRow}>Rental types <button type="button" className={styles.clearButton} onClick={() => setTypeDraft([])}>Clear</button></legend>{propertyTypes.map((item) => <label key={item.value}><input type="checkbox" checked={typeDraft.includes(item.value)} onChange={(event) => setTypeDraft((current) => event.target.checked ? [...current, item.value] : current.filter((value) => value !== item.value))} /><span>{item.label}</span></label>)}</fieldset>
        <div className={styles.modalActions}><Button type="button" variant="outline" onClick={() => setTypeOpen(false)}>Cancel</Button><Button type="submit">Apply types</Button></div>
      </form>
    </Modal>
  </div>;
}

function GuestDrawer({ open, onClose, onAccount }: { open: boolean; onClose: () => void; onAccount: () => void }) {
  if (!open) return null;
  return <Modal surface="finder" open={open} onClose={onClose} title="AbangCebu Menu" className={styles.drawerDialog}><aside className={styles.drawer}>
    <button className={styles.closeButton} onClick={onClose} aria-label="Close menu"><X size={20} /></button><Image src="/icons/main_Logo.png" alt="AbangCebu" width={140} height={41} className={styles.drawerLogo} />
    <nav aria-label="Main menu"><p className={styles.sectionLabel}>EXPLORE</p><Link href="/" className={styles.navItem} onClick={onClose}><Compass size={18} />Find rentals</Link>
      <button className={styles.navItem} onClick={onAccount}><Bookmark size={18} aria-hidden="true" />Saved rentals</button>
      <p className={styles.sectionLabel}>FOR LANDLORDS</p><button className={styles.navItem} onClick={() => { onClose(); onAccount(); }}><PlusCircle size={18} />List your property</button>
      <p className={styles.sectionLabel}>SUPPORT</p><a href="mailto:support@abangcebu.ai" className={styles.navItem}><HelpCircle size={18} />Help &amp; FAQs</a></nav>
    <div className={styles.guestCard}><div><User size={18} /><b>Guest account</b></div><button onClick={onAccount}>Sign in / Create account</button><small>Free for renters and landlords in Cebu.</small></div>
  </aside></Modal>;
}

function Assistant() {
  const [open, setOpen] = useState(false);
  return <div className={styles.assistant}>
    {open && <section className={styles.chatPanel} aria-label="AbangCebu assistant">
      <header className={styles.chatHeader}><Image src="/icons/chatbot_logo.png" alt="" width={36} height={36} /><div><b>AbangCebu assistant</b><span>Rental chat is not connected</span></div><button onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button><button onClick={() => setOpen(false)} aria-label="Reset chat"><span aria-hidden="true">↻</span></button></header>
      <div className={styles.chatMessages}><p>Hi! I can help you look for a place in Cebu. Live rental recommendations will appear once the rental service is available.</p><div className={styles.chatNotice} role="status">AI chat service is not connected. No properties are recommended.</div><div className={styles.suggestions}><button disabled>Find a room under ₱3,500</button><button disabled>Show rentals near IT Park</button></div></div>
      <form className={styles.chatComposer} onSubmit={(event) => event.preventDefault()}><label className="sr-only" htmlFor="assistant-message">Message AbangCebu</label><input id="assistant-message" placeholder="Ask about rentals…" disabled /><button aria-label="Send message" disabled><Send size={18} /></button></form>
    </section>}
    <button className={styles.chatLauncher} aria-label="Ask AbangCebu" onClick={() => setOpen((value) => !value)}><Image src="/icons/chatbot_logo.png" alt="" width={56} height={56} /><MessageCircle size={19} aria-hidden="true" /></button>
  </div>;
}

export function RestoredFinderShell({ rentalStatus: statusOverride }: { rentalStatus?: "loading" | "error" | "ready" }) {
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
  const rentalStatus = sampleMode ? "ready" : statusOverride ?? inventory.status;
  const rentals = sampleMode ? sampleRentals : statusOverride === undefined ? inventory.rentals : [];
  const [filters, setFilters] = useState<RentalFilters>(DEFAULT_RENTAL_FILTERS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [mapRadius, setMapRadius] = useState(2);
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searchCenter, setSearchCenter] = useState<[number, number]>([123.8854, 10.3157]);
  const visibleRentals = searchPreviewRentals(rentals, { ...filters, radiusKm: mapRadius }, "", searchCenter);
  const title = rentalStatus === "loading" ? "Loading rentals…" : rentalStatus === "error" ? "Rental inventory unavailable" : "No verified rentals found";
  const statusMessage = rentalStatus === "loading" ? "Checking the configured rental data service…" : rentalStatus === "error" ? "Live listings could not be loaded. No sample properties are shown." : "No live rental records match your search area.";

  return <main className={styles.app}><header className={styles.header}>
    <button className={styles.iconButton} aria-label="Open menu" onClick={() => setDrawerOpen(true)}><Menu size={21} /></button>
    <Link href="/" aria-label="AbangCebu home"><Image src="/icons/main_Logo.png" alt="AbangCebu" width={138} height={40} priority /></Link>
    <MapSearch className={styles.headerSearch} disabled={false} onSelect={setSelectedPlace} />
  </header>
  <button className={styles.signIn} aria-label="Open account dialog" onClick={() => setAccountOpen(true)}><User size={17} /><span>Sign in</span></button>
  <QuickFilters filters={filters} onChange={setFilters} onOpenFilters={() => setAdvancedOpen(true)} mapRadius={mapRadius} onRadiusChange={setMapRadius} />
  <section className={styles.mapStage}><MapCanvasLoader rentals={rentals} selectedPlace={selectedPlace} dataStatus={rentalStatus} filters={filters} onFiltersChange={setFilters} locationQuery={locationQuery} onLocationQueryChange={setLocationQuery} searchRadiusKm={mapRadius} onSearchRadiusKmChange={setMapRadius} onSearchCenterChange={setSearchCenter} />
    <div className={styles.resultsRail} role="complementary" aria-label="Rental listings" aria-busy={rentalStatus === "loading"}><div className={styles.resultsHeader}><div><span className={styles.available}><i />{sampleMode ? "SAMPLE RENTALS" : "RENTALS IN CEBU"}</span><h1>Find rentals in Cebu</h1><p role="status">{rentalStatus === "loading" ? "Loading…" : rentalStatus === "error" ? "Listings unavailable" : `${visibleRentals.length} ${visibleRentals.length === 1 ? "listing" : "listings"} found${sampleMode ? " in sample data" : ""}`}</p></div></div>
      {sampleMode && <div className={styles.inventoryState} role="status"><b>Sample data is on</b><p>These fictional rentals are for checking Area, Budget, Type, and Filters. They are not real offers.</p><button onClick={() => setSampleMode(false)}>Return to live data</button></div>}
      {rentalStatus !== "ready" || visibleRentals.length === 0 ? <div className={styles.inventoryState} role={rentalStatus === "error" ? "alert" : "status"}><b>{title}</b><p>{statusMessage}</p>{rentalStatus === "error" || (rentalStatus === "ready" && rentals.length === 0) ? <><button onClick={() => setSampleMode(true)}>Use sample data</button>{rentalStatus === "error" && statusOverride === undefined && <button onClick={() => { setInventory({ status: "loading", rentals: [] }); setRequest((value) => value + 1); }}>Try again</button>}</> : rentalStatus === "ready" ? <button onClick={() => { setFilters(DEFAULT_RENTAL_FILTERS); setLocationQuery(""); }}>Clear filters</button> : null}</div> : <ul className={styles.rentalList}>{visibleRentals.map((rental) => <li key={rental.id}><article className={styles.rentalCard}>
        <div className={styles.noPhoto}><Building2 size={22} aria-hidden="true" /><span>No photos provided</span></div>
        <span className={styles.category}>{propertyTypes.find(({ value }) => value === (rental.propertyType ?? rental.type))?.label ?? rental.type.replaceAll(/[-_]/g, " ")}</span>
        <h2>{rental.title}</h2><p className={styles.price}>{formatPrice(rental.price)}<span> / month · per {rental.basis}</span></p>
        <p>{rental.locality}</p><p>{rental.description}</p>
        {rental.amenities.length > 0 && <ul className={styles.amenities} aria-label="Amenities">{rental.amenities.map((amenity, index) => <li key={`${amenity}-${index}`}>{amenity}</li>)}</ul>}
      </article></li>)}</ul>}
      <p className={styles.radius}>Search area: {mapRadius} km radius</p>
    </div>
  </section>
  {advancedOpen && <RentalFilterDialog filters={filters} open onOpenChange={setAdvancedOpen} onApply={setFilters} matchCount={visibleRentals.length} />}
  <GuestDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onAccount={() => { setDrawerOpen(false); setAccountOpen(true); }} />
  <Modal surface="finder" open={accountOpen} onClose={() => setAccountOpen(false)} title="Welcome to AbangCebu" description="Browse as a guest. Sign in to save rentals or manage a property." className={styles.accountDialog}>
    <AccountAccessContent mode={accountMode} onModeChange={setAccountMode} />
    <div className={styles.guestNote}><User size={17} /><span>You can keep browsing as a guest. Account supports renters and landlords.</span></div><div className={styles.landlordNote}><Building2 size={18} /><span><b>Listing a property?</b> Sign in with your landlord account to access authorized tools.</span></div>
  </Modal>
  <Assistant /></main>;
}
