"use client";

import { useEffect, useState } from "react";
import { SEARCH_FILTERS_CHANGE_EVENT } from "@/components/map/map-search-adapter";
import { type SearchFilters } from "@/lib/search-filters";

/** SCRUM-156 search integration contract: filters change with replaceState, without navigation. */
export function useMapSearchFilters() {
  const [filters, setFilters] = useState<SearchFilters | null>(null);

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ filters: SearchFilters }>).detail;
      if (detail?.filters) setFilters(detail.filters);
    };
    window.addEventListener(SEARCH_FILTERS_CHANGE_EVENT, receive);
    return () => window.removeEventListener(SEARCH_FILTERS_CHANGE_EVENT, receive);
  }, []);

  return filters;
}
