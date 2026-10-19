"use client";

import { useEffect, useState } from "react";
import MapCanvasLoader from "@/components/map/MapCanvasLoader";
import ResultsDrawer, { type RentalResult } from "@/components/map/ResultsDrawer";
import SearchFilterPanel from "@/components/map/SearchFilterPanel";
import { useSearchFilters } from "@/hooks/use-search-filters";
import {
  LISTING_HIGHLIGHT_EVENT,
  RENTAL_RESULTS_EVENT,
  publishListingHighlight,
  publishSearchFilters,
  type ListingHighlightDetail,
} from "@/components/map/map-search-adapter";

export default function MapDiscoveryExperience() {
  const { filters, updateFilters, clearFilters, activeFilterCount } = useSearchFilters();
  const [results, setResults] = useState<RentalResult[]>([]);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);

  useEffect(() => {
    publishSearchFilters(filters);
  }, [filters]);

  useEffect(() => {
    const receiveResults = (event: Event) => {
      const detail = (event as CustomEvent<{ results: RentalResult[] }>).detail;
      if (Array.isArray(detail?.results)) setResults(detail.results);
    };
    const receiveHighlight = (event: Event) => {
      const detail = (event as CustomEvent<ListingHighlightDetail>).detail;
      setActiveListingId(detail?.listingId ?? null);
    };
    window.addEventListener(RENTAL_RESULTS_EVENT, receiveResults);
    window.addEventListener(LISTING_HIGHLIGHT_EVENT, receiveHighlight);
    return () => {
      window.removeEventListener(RENTAL_RESULTS_EVENT, receiveResults);
      window.removeEventListener(LISTING_HIGHLIGHT_EVENT, receiveHighlight);
    };
  }, []);

  return (
    <main className="min-h-[100dvh] overflow-hidden">
      <MapCanvasLoader />
      <SearchFilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
      />
      <ResultsDrawer
        activeListingId={activeListingId}
        filters={filters}
        onFilterClick={() => document.querySelector<HTMLButtonElement>("[aria-label='Rental filters'] button")?.click()}
        onPinHighlight={publishListingHighlight}
        results={results}
      />
    </main>
  );
}
