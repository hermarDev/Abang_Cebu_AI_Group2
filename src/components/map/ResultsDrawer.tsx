"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from "react";
import type { SearchFilters } from "@/lib/search-filters";
import styles from "./ResultsDrawer.module.css";

export interface RentalResult {
  id: string;
  title: string;
  price: number;
  address: string;
  type: string;
  latitude: number;
  longitude: number;
  amenities: string[];
}

interface ResultsDrawerProps {
  results: RentalResult[];
  filters: SearchFilters;
  onPinHighlight: (listingId: string | null) => void;
  onFilterClick?: () => void;
  activeListingId?: string | null;
}

function filterResults(results: RentalResult[], filters: SearchFilters): RentalResult[] {
  return results.filter((listing) => {
    if (filters.type.length > 0 && !filters.type.includes(listing.type as SearchFilters["type"][number])) return false;
    if (filters.minRent !== undefined && listing.price < filters.minRent) return false;
    if (filters.maxRent !== undefined && listing.price > filters.maxRent) return false;
    if (filters.amenities.some((amenity) => !listing.amenities.includes(amenity))) return false;
    return true;
  });
}

export default function ResultsDrawer({
  results,
  filters,
  onPinHighlight,
  onFilterClick,
  activeListingId = null,
}: ResultsDrawerProps) {
  const [snap, setSnap] = useState<"peek" | "mid" | "full">("peek");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const drawerRef = useRef<HTMLElement>(null);
  const dragStartY = useRef<number | null>(null);
  const activeListingIdRef = useRef<string | null>(activeListingId);
  activeListingIdRef.current = activeListingId;
  const visibleResults = filterResults(results, filters);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  const clearHighlight = useCallback((listingId: string) => {
    if (activeListingIdRef.current === listingId) onPinHighlight(null);
  }, [onPinHighlight]);

  const handlePointerOver = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const card = (event.target as HTMLElement).closest<HTMLElement>("[data-listing-id]");
    if (card?.dataset.listingId) onPinHighlight(card.dataset.listingId);
  }, [onPinHighlight]);

  const handlePointerOut = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const card = (event.target as HTMLElement).closest<HTMLElement>("[data-listing-id]");
    const next = (event.relatedTarget as HTMLElement | null)?.closest?.("[data-listing-id]");
    if (card?.dataset.listingId && card.dataset.listingId !== next?.getAttribute("data-listing-id")) {
      clearHighlight(card.dataset.listingId);
    }
  }, [clearHighlight]);

  const handleTouchStart = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    dragStartY.current = event.touches[0]?.clientY ?? null;
    const card = (event.target as HTMLElement).closest<HTMLElement>("[data-listing-id]");
    if (card?.dataset.listingId) onPinHighlight(card.dataset.listingId);
  }, [onPinHighlight]);

  const handleTouchEnd = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const start = dragStartY.current;
    const end = event.changedTouches[0]?.clientY;
    dragStartY.current = null;
    if (start === null || end === undefined) return;
    const card = (event.target as HTMLElement).closest<HTMLElement>("[data-listing-id]");
    if (card?.dataset.listingId) onPinHighlight(card.dataset.listingId);
    const delta = start - end;
    if (delta > 40) setSnap((current) => current === "peek" ? "mid" : "full");
    if (delta < -40) setSnap((current) => current === "full" ? "mid" : "peek");
  }, [onPinHighlight]);

  const renderedResults = loading ? [] : visibleResults;

  return (
    <>
      <button
        className={styles.mobileOpen}
        onClick={() => setSnap((current) => current === "peek" ? "mid" : "full")}
        type="button"
      >{loading ? "Loading rentals…" : `${visibleResults.length} rentals nearby`}</button>

      <aside
        aria-label="Rental results"
        className={`${styles.drawer} ${styles[`snap-${snap}`]} ${expanded ? styles.desktopExpanded : ""}`}
        data-testid="results-drawer"
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        ref={drawerRef}
      >
        <button
          aria-label="Resize results sheet"
          className={styles.sheetHandle}
          onClick={() => setSnap((current) => current === "peek" ? "mid" : current === "mid" ? "full" : "peek")}
          type="button"
        ><span /></button>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>METRO CEBU</p>
            <h1>Places to stay</h1>
            <p aria-live="polite" className={styles.resultCount}>
              {loading ? "Finding nearby rentals…" : `${visibleResults.length} ${visibleResults.length === 1 ? "rental" : "rentals"} matching your filters`}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.filterShortcut} onClick={onFilterClick} type="button">Filters</button>
            <button aria-label={expanded ? "Collapse results" : "Expand results"} className={styles.expandButton} onClick={() => setExpanded((current) => !current)} type="button">{expanded ? "−" : "+"}</button>
          {activeListingId && (
            <button aria-label="Clear selected rental" className={styles.clearSelection} onClick={() => onPinHighlight(null)} type="button">
              Clear selection
            </button>
          )}
          </div>
        </header>

        <div aria-busy={loading} className={styles.cards}>
          {loading ? (
            <p className={styles.emptyState} role="status">Loading rental listings…</p>
          ) : renderedResults.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No rentals match these filters.</strong>
              <span>Try a wider price range or remove a filter.</span>
            </div>
          ) : (
            renderedResults.map((listing) => (
              <article
                aria-label={`${listing.title}, ₱${listing.price.toLocaleString()} per month`}
                className={`${styles.card} ${activeListingId === listing.id ? styles.cardActive : ""}`}
                data-listing-id={listing.id}
                key={listing.id}
                onClick={() => onPinHighlight(listing.id)}
                onFocus={() => onPinHighlight(listing.id)}
                onBlur={() => onPinHighlight(null)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") onPinHighlight(null);
                }}
                tabIndex={0}
                >
                <div aria-hidden="true" className={styles.photoFallback}>{listing.type === "bedspace" ? "Room & board" : "Apartment"}</div>
                <div className={styles.cardDetails}>
                  <p className={styles.price}>₱{listing.price.toLocaleString()} <span>/ month</span></p>
                  <h2>{listing.title}</h2>
                  <p className={styles.address}>{listing.address}</p>
                  <div aria-label="Amenities" className={styles.amenities}>
                    {listing.amenities.slice(0, 3).map((amenity) => <span key={amenity}>{amenity.replaceAll("_", " ")}</span>)}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </aside>
    </>
  );
}

