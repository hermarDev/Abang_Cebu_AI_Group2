import type { ListingPriceFeatureCollection, MapListing, ViewportBounds } from "@/lib/search/landmark-search";

export interface ViewportSearchQuery {
  bounds: ViewportBounds;
  query: string;
  landmarkId?: string;
  signal: AbortSignal;
}

/**
 * SCRUM-156's spatial RPC and row contract are not present in the checked-in
 * Supabase schema. Supply this adapter from the authorized search service once
 * its signature and return shape are confirmed.
 */
export interface ListingSearchAdapter {
  searchViewport(query: ViewportSearchQuery): Promise<MapListing[]>;
}

export type ListingFeatureCollection = {
  type: "FeatureCollection";
  features: ListingPriceFeatureCollection["features"];
};
