"use client";

import dynamic from "next/dynamic";
import type { PlaceResult } from "@/lib/search/places";
import type { RentalResult } from "@/contracts/preview";
import type { RentalFilters } from "@/contracts/rental-filters";

const MapCanvas = dynamic(() => import("./MapCanvas").then((module) => module.MapCanvas), {
  ssr: false,
  loading: () => (
    <div role="status" aria-live="polite" className="flex h-[100dvh] min-h-96 items-center justify-center bg-[#e7efe9] text-[#0f2742]">
      Loading the interactive map…
    </div>
  ),
});
type MapCanvasLoaderProps = {
  selectedRentalId?: string | null;
  onSelectRental?: (id: string) => void;
  selectedPlace?: PlaceResult | null;
  rentals?: RentalResult[];
  dataStatus?: "loading" | "ready" | "error";
  filters?: RentalFilters;
  onFiltersChange?: (filters: RentalFilters) => void;
  locationQuery?: string;
  onLocationQueryChange?: (query: string) => void;
  searchRadiusKm?: number;
  onSearchRadiusKmChange?: (radius: number) => void;
  onSearchCenterChange?: (center: [number, number]) => void;
};

export default function MapCanvasLoader(props: MapCanvasLoaderProps) {
  const { rentals = [], dataStatus = "error", filters, onFiltersChange, locationQuery, onLocationQueryChange, searchRadiusKm, onSearchRadiusKmChange, onSearchCenterChange } = props;
  return <MapCanvas selectedRentalId={props.selectedRentalId} onSelectRental={props.onSelectRental} selectedPlace={props.selectedPlace} rentals={rentals} dataStatus={dataStatus} filters={filters} onFiltersChange={onFiltersChange} locationQuery={locationQuery} onLocationQueryChange={onLocationQueryChange} searchRadiusKm={searchRadiusKm} onSearchRadiusKmChange={onSearchRadiusKmChange} onSearchCenterChange={onSearchCenterChange} />;
}
