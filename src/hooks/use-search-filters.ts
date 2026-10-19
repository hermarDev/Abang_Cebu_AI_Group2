import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_SEARCH_FILTERS,
  parseSearchFilters,
  serializeSearchFilters,
  type SearchFilters,
} from "@/lib/search-filters";

const FILTERS_URL_CHANGE_EVENT = "abangcebu:search-filters-url-change";

function subscribeToLocation(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(FILTERS_URL_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(FILTERS_URL_CHANGE_EVENT, onStoreChange);
  };
}

const getLocationSearch = () => window.location.search;
const getServerLocationSearch = () => "";

function writeFiltersToUrl(filters: SearchFilters) {
  const current = new URLSearchParams(window.location.search);
  const next = serializeSearchFilters(filters, current);
  if (next.toString() === current.toString()) return;

  const query = next.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  // Keep unrelated query params and use Next.js's supported native-history integration.
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(FILTERS_URL_CHANGE_EVENT));
}

export function useSearchFilters() {
  const locationSearch = useSyncExternalStore(
    subscribeToLocation,
    getLocationSearch,
    getServerLocationSearch,
  );
  const filters = locationSearch
    ? parseSearchFilters(locationSearch)
    : DEFAULT_SEARCH_FILTERS;

  const clearFilters = useCallback(() => writeFiltersToUrl(DEFAULT_SEARCH_FILTERS), []);
  const updateFilters = useCallback((next: SearchFilters) => writeFiltersToUrl(next), []);

  const activeFilterCount =
    filters.type.length +
    filters.amenities.length +
    (filters.gender ? 1 : 0) +
    (filters.minRent !== undefined ? 1 : 0) +
    (filters.maxRent !== undefined ? 1 : 0);

  return { filters, updateFilters, clearFilters, activeFilterCount };
}
