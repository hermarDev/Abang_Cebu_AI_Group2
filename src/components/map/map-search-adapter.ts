import type { SearchFilters } from "@/lib/search-filters";

export const SEARCH_FILTERS_CHANGE_EVENT = "abangcebu:search-filters-change";
export const RENTAL_RESULTS_EVENT = "abangcebu:rental-results";
export const LISTING_HIGHLIGHT_EVENT = "abangcebu:listing-highlight";

export interface ListingHighlightDetail {
  listingId: string | null;
}

export function publishSearchFilters(filters: SearchFilters): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ filters: SearchFilters }>(SEARCH_FILTERS_CHANGE_EVENT, {
      detail: { filters },
    }),
  );
}

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

export function publishRentalResults(results: RentalResult[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ results: RentalResult[] }>(RENTAL_RESULTS_EVENT, {
      detail: { results },
    }),
  );
}

/**
 * Adapter contract for MapCanvas/search integration. MapCanvas listens for
 * LISTING_HIGHLIGHT_EVENT and applies the state to the matching listing pin.
 * This event-based boundary keeps the drawer and map independently mountable.
 */
export function publishListingHighlight(listingId: string | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ListingHighlightDetail>(LISTING_HIGHLIGHT_EVENT, {
      detail: { listingId },
    }),
  );
}
