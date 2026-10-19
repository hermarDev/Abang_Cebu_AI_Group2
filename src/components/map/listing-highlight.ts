import { LISTING_HIGHLIGHT_EVENT, type ListingHighlightDetail } from "@/components/map/map-search-adapter";

export type ListingMarker = { getElement: () => HTMLElement };
type ActiveListingReference = { current: string | null };
export type SetListingMarkerActive = (marker: ListingMarker, active: boolean) => void;

/** Subscribe the map's listing markers to result-card highlight events. */
export function subscribeToListingHighlights<T extends ListingMarker>(
  markers: ReadonlyMap<string, T>,
  activeListingId: ActiveListingReference,
  setMarkerActive: (marker: T, active: boolean) => void,
): () => void {
  const handleHighlight = (event: Event) => {
    const detail: unknown = (event as CustomEvent<unknown>).detail;
    if (typeof detail !== "object" || detail === null || !("listingId" in detail)) return;

    const nextId = (detail as ListingHighlightDetail).listingId;
    if (nextId !== null && typeof nextId !== "string") return;

    const previousId = activeListingId.current;
    if (previousId === nextId) return;

    if (previousId) {
      const previousMarker = markers.get(previousId);
      if (previousMarker) setMarkerActive(previousMarker, false);
    }

    activeListingId.current = nextId;

    if (nextId) {
      const nextMarker = markers.get(nextId);
      if (nextMarker) setMarkerActive(nextMarker, true);
    }
  };

  window.addEventListener(LISTING_HIGHLIGHT_EVENT, handleHighlight);
  return () => window.removeEventListener(LISTING_HIGHLIGHT_EVENT, handleHighlight);
}
