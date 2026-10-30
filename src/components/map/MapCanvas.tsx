"use client";

import { Plus, Minus, LocateFixed, Search } from "lucide-react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Map as MapLibreMap, Marker, Popup, setWorkerUrl } from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import * as RadixPopover from "@radix-ui/react-popover";
import type { PlaceResult } from "@/lib/search/places";
import { formatPrice, searchPreviewRentals } from "@/features/rentals/search";
import type { RentalResult } from "@/contracts/preview";
import { DEFAULT_RENTAL_FILTERS } from "@/contracts/rental-filters";
import { RentalFilterDialog } from "@/features/rentals/RentalFilterDialog";
import { Select } from "@/components/ui/Select";
import MapSearch from "./MapSearch";
import styles from "./MapCanvas.module.css";
import { groupRentalsByCoordinates, makeRadiusPolygon, METRO_CEBU_CENTER } from "./map-geometry";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function verificationLabel(status: RentalResult["verificationStatus"]): string {
  if (!status) return "Verification status unknown";
  if (status === "unverified") return "Not verified";
  return `${status.replaceAll("_", " ")} listing`;
}

// Serve MapLibre's worker files together so its worker can resolve the shared module.
setWorkerUrl("/maplibre-gl/maplibre-gl-worker.mjs");

const DEFAULT_ZOOM = 13.4;
const LOCATION_ZOOM = 15.5;
const LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 60_000,
};

const LOCATION_ERROR_MESSAGES: Record<number, string> = {
  1: "Location permission was denied. The map remains centered on the default search area.",
  2: "Your location is unavailable. The map remains centered on the default search area.",
  3: "Location timed out. The map remains centered on the default search area.",
};

type MapStatus = "loading" | "ready" | "unavailable";
type LocationStatus = "idle" | "locating" | "located" | "fallback";
type ResolvedTheme = "light" | "dark";

const DEFAULT_LIGHT_STYLE_URL = "/styles/osm.json";

export function resolveMapStyleUrl(resolvedTheme: ResolvedTheme = "light", configuredStyleUrl?: string): string {
  if (configuredStyleUrl && configuredStyleUrl !== DEFAULT_LIGHT_STYLE_URL) return configuredStyleUrl;
  return resolvedTheme === "dark" ? "/styles/osm-dark.json" : DEFAULT_LIGHT_STYLE_URL;
}

type MapCanvasProps = {
  selectedPlace?: PlaceResult | null;
  selectedRentalId?: string | null;
  onSelectRental?: (id: string) => void;
  rentals?: RentalResult[];
  dataStatus?: "loading" | "ready" | "error";
  filters?: typeof DEFAULT_RENTAL_FILTERS;
  onFiltersChange?: (filters: typeof DEFAULT_RENTAL_FILTERS) => void;
  locationQuery?: string;
  onLocationQueryChange?: (query: string) => void;
  searchRadiusKm?: number;
  onSearchRadiusKmChange?: (radius: number) => void;
  onSearchCenterChange?: (center: [number, number]) => void;
  resolvedTheme?: ResolvedTheme;
  assistantControlsTarget?: HTMLDivElement | null;
  decorative?: boolean;
  showAttribution?: boolean;
};

export function MapCanvas({ selectedPlace, selectedRentalId, onSelectRental, rentals = [], dataStatus = "error", filters: externalFilters, onFiltersChange, locationQuery: externalLocationQuery, onLocationQueryChange, searchRadiusKm: externalSearchRadiusKm, onSearchRadiusKmChange, onSearchCenterChange, resolvedTheme = "light", assistantControlsTarget, decorative = false, showAttribution = true }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedRental, setSelectedRental] = useState<string | null>(null);
  const activeSelectedRental = selectedRentalId !== undefined ? selectedRentalId : selectedRental;
  const [internalFilters, setInternalFilters] = useState(DEFAULT_RENTAL_FILTERS);
  const [internalLocationQuery, setInternalLocationQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchCenter, setSearchCenter] = useState<[number, number]>(METRO_CEBU_CENTER);
  const searchCenterRef = useRef<[number, number]>(METRO_CEBU_CENTER);
  const searchAppliedZoomRef = useRef(DEFAULT_ZOOM);
  const [internalSearchRadiusKm, setInternalSearchRadiusKm] = useState(2);
  const mapLoadedRef = useRef(false);
  const requestedStyleRef = useRef<string | null>(null);
  const initialResolvedThemeRef = useRef(resolvedTheme);
  const onSearchCenterChangeRef = useRef(onSearchCenterChange);
  useEffect(() => { onSearchCenterChangeRef.current = onSearchCenterChange; }, [onSearchCenterChange]);
  const publishSearchCenter = useCallback((center: [number, number]) => {
    searchCenterRef.current = center;
    setSearchCenter(center);
    onSearchCenterChangeRef.current?.(center);
  }, []);
  const filters = externalFilters ?? internalFilters;
  const setFilters = onFiltersChange ?? setInternalFilters;
  const locationQuery = externalLocationQuery ?? internalLocationQuery;
  const setLocationQuery = onLocationQueryChange ?? setInternalLocationQuery;
  const searchRadiusKm = externalSearchRadiusKm ?? internalSearchRadiusKm;
  const setSearchRadiusKm = onSearchRadiusKmChange ?? setInternalSearchRadiusKm;
  const searchRadiusMeters = searchRadiusKm * 1000;
  const externallyControlled = externalFilters !== undefined;
  const visibleRentals = useMemo(() => searchPreviewRentals(rentals, { ...filters, radiusKm: searchRadiusKm }, externallyControlled ? "" : locationQuery, searchCenter) as RentalResult[], [rentals, filters, locationQuery, searchCenter, searchRadiusKm, externallyControlled]);
  const markerGroups = useMemo(() => groupRentalsByCoordinates(visibleRentals), [visibleRentals]);
  const onSelectRentalRef = useRef(onSelectRental ?? setSelectedRental);
  useEffect(() => {
    onSelectRentalRef.current = onSelectRental ?? setSelectedRental;
  }, [onSelectRental]);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const rentalMarkersRef = useRef<Marker[]>([]);
  const rentalPopupRef = useRef<Popup | null>(null);
  const locationRequestRef = useRef(0);
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [statusMessage, setStatusMessage] = useState(
    "Map centered on the default search area. Use Locate me to find your position.",
  );
  const [areaDirty, setAreaDirty] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [chooserGroup, setChooserGroup] = useState<{ rentals: RentalResult[]; anchor: HTMLElement } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    let mapLoaded = false;
    mapLoadedRef.current = false;
    let map: MapLibreMap;

    try {
      const configuredStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
      const initialStyleUrl = resolveMapStyleUrl(initialResolvedThemeRef.current, configuredStyleUrl);
      requestedStyleRef.current = initialStyleUrl;
      map = new MapLibreMap({
        container,
        style: initialStyleUrl,
        interactive: !decorative,
        attributionControl: showAttribution ? {
          compact: true,
          customAttribution: process.env.NEXT_PUBLIC_MAP_STYLE_URL && process.env.NEXT_PUBLIC_MAP_STYLE_URL !== "/styles/osm.json"
            ? undefined
            : '<a href="https://openfreemap.org">OpenFreeMap</a> <a href="https://www.openmaptiles.org/">© OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
        } : false,
        center: METRO_CEBU_CENTER,
        zoom: DEFAULT_ZOOM,
        bearing: 0,
        pitch: 0,
      });
    } catch {
      const fallbackTimer = window.setTimeout(() => {
        setMapStatus("unavailable");
        setStatusMessage(
          "The interactive map is unavailable in this browser. The default search area remains selected.",
        );
      }, 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    mapRef.current = map;

    const hideDecorativeLabels = () => {
      if (!decorative || !map.isStyleLoaded()) return;
      for (const layer of map.getStyle().layers) {
        if (layer.type !== "symbol" || !("text-field" in (layer.layout ?? {}))) continue;
        map.setPaintProperty(layer.id, "text-opacity", 0);
      }
    };
    const onLoad = () => {
      mapLoaded = true;
      hideDecorativeLabels();
      mapLoadedRef.current = true;
      const center = map.getCenter();
      searchCenterRef.current = [center.lng, center.lat];
      setSearchCenter(searchCenterRef.current);
      onSearchCenterChangeRef.current?.(searchCenterRef.current);
      if (active) setMapStatus("ready");
    };
    const onMapError = () => {
      if (active && !mapLoaded) {
        setMapStatus("unavailable");
        setStatusMessage(
          "The map could not be loaded. Check your connection and try again.",
        );
      }
    };

    const onMoveEnd = (event: { originalEvent?: unknown }) => {
      if (!event.originalEvent) return;
      const center = map.getCenter();
      if (Math.abs(center.lng - searchCenterRef.current[0]) > 0.000001 || Math.abs(center.lat - searchCenterRef.current[1]) > 0.000001 || Math.abs(map.getZoom() - searchAppliedZoomRef.current) > 0.05) {
        setAreaDirty(true);
      }
    };
    const onDragStart = () => setIsDragging(true);
    const onDragEnd = () => setIsDragging(false);
    map.on("dragstart", onDragStart);
    map.on("dragend", onDragEnd);
    map.on("style.load", hideDecorativeLabels);
    map.once("load", onLoad);
    map.on("error", onMapError);
    map.on("moveend", onMoveEnd);

    // ResizeObserver + rAF: track container size changes smoothly
    let rafId = 0;
    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => { map.resize(); });
        })
      : null;
    resizeObserver?.observe(container);

    return () => {
      active = false;
      locationRequestRef.current += 1;
      mapLoadedRef.current = false;
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      markerRef.current?.remove();
      rentalPopupRef.current?.remove();
      rentalMarkersRef.current.forEach((marker) => marker.remove());
      rentalMarkersRef.current = [];
      markerRef.current = null;
      map.off("error", onMapError);
      map.off("moveend", onMoveEnd);
      map.off("dragstart", onDragStart);
      map.off("dragend", onDragEnd);
      map.off("style.load", hideDecorativeLabels);
      map.remove();
      mapRef.current = null;
    };
  }, [decorative, showAttribution]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const configuredStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
    const styleUrl = resolveMapStyleUrl(resolvedTheme, configuredStyleUrl);
    if (styleUrl === requestedStyleRef.current) return;
    requestedStyleRef.current = styleUrl;
    map.setStyle(styleUrl);
  }, [resolvedTheme]);

  const locateMe = useCallback(() => {
    const map = mapRef.current;
    if (!map || locationStatus === "locating") return;
    const requestId = ++locationRequestRef.current;

      if (!navigator.geolocation) {
        markerRef.current?.remove();
        markerRef.current = null;
        searchCenterRef.current = METRO_CEBU_CENTER;
        setSearchCenter(METRO_CEBU_CENTER);
        onSearchCenterChangeRef.current?.(METRO_CEBU_CENTER);
        setLocationStatus("fallback");
      setStatusMessage(
        "Location is not supported by this browser. The map remains centered on the default search area.",
      );
      map.flyTo({ center: METRO_CEBU_CENTER, zoom: DEFAULT_ZOOM, duration: 500 });
      return;
    }

    setLocationStatus("locating");
    setStatusMessage("Finding your location…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationRequestRef.current !== requestId) return;
        const currentMap = mapRef.current;
        if (!currentMap) return;

        const center: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        markerRef.current?.remove();
        markerRef.current = new Marker({ color: "#2563eb" })
          .setLngLat(center)
          .addTo(currentMap);
        searchCenterRef.current = center;
        setSearchCenter(center);
        onSearchCenterChangeRef.current?.(center);
        setLocationQuery("Current location");
        setLocationStatus("located");
        setStatusMessage("Your location was found and the map was recentered.");
      },
      (error) => {
        if (locationRequestRef.current !== requestId) return;
        markerRef.current?.remove();
        markerRef.current = null;
        const currentMap = mapRef.current;
        searchCenterRef.current = METRO_CEBU_CENTER;
        setSearchCenter(METRO_CEBU_CENTER);
        onSearchCenterChangeRef.current?.(METRO_CEBU_CENTER);
        setLocationQuery("");
        if (currentMap) {
          currentMap.flyTo({
            center: METRO_CEBU_CENTER,
            zoom: DEFAULT_ZOOM,
            duration: 500,
          });
        }
        setLocationStatus("fallback");
        setStatusMessage(
          LOCATION_ERROR_MESSAGES[error.code] ??
            "Could not get your location. The map remains centered on the default search area.",
        );
      },
      LOCATION_OPTIONS,
    );
  }, [locationStatus, setLocationQuery]);



  const selectPlace = useCallback((place: PlaceResult) => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    const [longitude, latitude] = place.coordinates;
    publishSearchCenter([longitude, latitude]);
    searchAppliedZoomRef.current = LOCATION_ZOOM;
    setLocationQuery(place.name);
    rentalPopupRef.current?.remove();
    map.flyTo({ center: [longitude, latitude], zoom: LOCATION_ZOOM, duration: 1000 });
    setLocationStatus("idle");
    setAreaDirty(false);
    setStatusMessage(`Map centered on ${place.name}.`);
  }, [setLocationQuery, publishSearchCenter]);

  useEffect(() => {
    if (selectedPlace && mapStatus === "ready") selectPlace(selectedPlace);
  }, [selectedPlace, mapStatus, selectPlace]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    rentalMarkersRef.current.forEach((marker) => marker.remove());
    rentalMarkersRef.current = [];
    rentalPopupRef.current?.remove();
    rentalPopupRef.current = null;
    if (decorative) return;
    for (const group of markerGroups) {
      const element = document.createElement("button");
      const titles = group.rentals.map((rental) => rental.title);
      element.type = "button";
      element.className = "rental-map-marker";
      element.setAttribute("aria-pressed", String(group.rentals.some((rental) => rental.id === activeSelectedRental)));
      element.setAttribute("aria-label", group.rentals.length === 1
        ? `${group.rentals[0].title}, ${formatPrice(group.rentals[0].price)} per month`
        : `${group.rentals.length} rentals at this location: ${titles.join(", ")}`);
      if (group.rentals.length > 1) element.setAttribute("aria-haspopup", "dialog");
      element.textContent = group.rentals.length === 1 ? formatPrice(group.rentals[0].price) : String(group.rentals.length);
      element.addEventListener("click", () => {
        if (group.rentals.length > 1) {
          setChooserGroup({ rentals: group.rentals, anchor: element });
          return;
        }
        const rental = group.rentals[0];
        onSelectRentalRef.current?.(rental.id);
        setSelectedRental(rental.id);
        rentalPopupRef.current?.remove();
        rentalPopupRef.current = new Popup({ offset: 18, closeButton: true })
          .setLngLat(rental.coordinates)
          .setHTML(`<strong>${escapeHtml(rental.title)}</strong><br>${escapeHtml(rental.locality)}<br>${escapeHtml(formatPrice(rental.price))} / month`)
          .addTo(map);
      });
      rentalMarkersRef.current.push(new Marker({ element, anchor: "bottom" }).setLngLat(group.coordinates).addTo(map));
    }
    const updateArea = () => {
      const radiusRing = makeRadiusPolygon(searchCenter, searchRadiusMeters).geometry.coordinates[0];
      const data = {
        type: "Feature" as const,
        properties: { radiusMeters: searchRadiusMeters },
        geometry: { type: "Polygon" as const, coordinates: [radiusRing] },
      };
      if (!map.getSource("rental-search-area")) {
        map.addSource("rental-search-area", { type: "geojson", data });
      } else {
        (map.getSource("rental-search-area") as GeoJSONSource).setData(data);
      }
      if (!map.getLayer("rental-search-area-fill")) {
        map.addLayer({ id: "rental-search-area-fill", type: "fill", source: "rental-search-area", paint: { "fill-color": "#2563eb", "fill-opacity": 0.08 } });
      }
      if (!map.getLayer("rental-search-area-outline")) {
        map.addLayer({ id: "rental-search-area-outline", type: "line", source: "rental-search-area", paint: { "line-color": "#2563eb", "line-width": 2, "line-opacity": 0.7 } });
      }
    };
    updateArea();
    const onStyleLoad = () => updateArea();
    map.on("style.load", onStyleLoad);
    const selected = visibleRentals.find((rental) => rental.id === activeSelectedRental);
    if (selected) map.flyTo({ center: selected.coordinates, zoom: Math.max(map.getZoom(), 14), duration: 350 });
    return () => { map.off("style.load", onStyleLoad); };
  }, [decorative, markerGroups, visibleRentals, searchCenter, searchRadiusMeters, activeSelectedRental, mapStatus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== "ready" || decorative) return;
    const updatePreview = () => {
      if (!map.isStyleLoaded()) return;
      const center = map.getCenter();
      const data = makeRadiusPolygon([center.lng, center.lat], searchRadiusMeters);
      const source = map.getSource("rental-search-preview") as GeoJSONSource | undefined;
      if (source) source.setData(data);
      else map.addSource("rental-search-preview", { type: "geojson", data });
      if (!map.getLayer("rental-search-preview-outline")) {
        map.addLayer({ id: "rental-search-preview-outline", type: "line", source: "rental-search-preview", paint: { "line-color": "#2563eb", "line-width": 2, "line-dasharray": [3, 3] } });
      }
      map.setLayoutProperty("rental-search-preview-outline", "visibility", isDragging || areaDirty ? "visible" : "none");
    };
    updatePreview();
    map.on("move", updatePreview);
    map.on("style.load", updatePreview);
    return () => {
      map.off("move", updatePreview);
      map.off("style.load", updatePreview);
    };
  }, [mapStatus, isDragging, areaDirty, searchRadiusMeters, decorative]);

  const mapControls = (
    <div className={[styles.mapControls, externallyControlled && styles.controlledControls, assistantControlsTarget && styles.assistantControls].filter(Boolean).join(" ")} role="group" aria-label="Map controls">
      <div className={styles.zoomControls}>
        <button className={styles.secondaryButton} type="button" aria-label="Zoom in" disabled={mapStatus !== "ready"} onClick={() => mapRef.current?.zoomIn()}><Plus size={20} aria-hidden="true" /></button>
        <button className={styles.secondaryButton} type="button" aria-label="Zoom out" disabled={mapStatus !== "ready"} onClick={() => mapRef.current?.zoomOut()}><Minus size={20} aria-hidden="true" /></button>
      </div>
      <button
        className={styles.controlButton}
        type="button"
        onClick={locateMe}
        disabled={mapStatus !== "ready" || locationStatus === "locating"}
        aria-label={
          locationStatus === "locating"
            ? "Finding your location"
            : "Locate me"
        }
      >
        <LocateFixed size={20} aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <section className={styles.mapRoot} aria-label={decorative ? "Cebu map background" : "Rental map"}>
      <div
        ref={containerRef}
        className={styles.mapCanvas}
        role={decorative ? undefined : "region"}
        aria-label={decorative ? "Map of Cebu" : "Interactive rental map"}
        aria-busy={mapStatus === "loading"}
      />

      {!decorative && mapStatus === "unavailable" && (
        <div className={styles.mapFallback} role="status">
          <strong>Map unavailable</strong>
          <span>The default search area remains selected.</span>
        </div>
      )}

      {!decorative && isDragging && mapStatus === "ready" && (
        <>
          <span data-map-drag-target aria-hidden="true" className={styles.dragTarget} />
          <div role="status" className={`${styles.searchAreaButton} ${styles.dragFeedback}`}>Move map to choose an area</div>
        </>
      )}
      {!decorative && areaDirty && !isDragging && mapStatus === "ready" && (
        <button type="button" aria-label="Search this area" className={styles.searchAreaButton} onClick={() => {
          const map = mapRef.current;
          map?.stop();
          const center = map?.getCenter();
          if (center) publishSearchCenter([center.lng, center.lat]);
          searchAppliedZoomRef.current = mapRef.current?.getZoom() ?? DEFAULT_ZOOM;
          setAreaDirty(false);
        }}>
          <Search size={18} aria-hidden="true" />
          <span>Search this area<small>{searchRadiusKm} km radius</small></span>
        </button>
      )}

      {!decorative && chooserGroup && (
        <RadixPopover.Root open onOpenChange={(next) => { if (!next) setChooserGroup(null); }}>
          <RadixPopover.Anchor virtualRef={{ current: chooserGroup.anchor }} />
          <RadixPopover.Portal>
            <RadixPopover.Content className={styles.markerChooser} sideOffset={8} onOpenAutoFocus={(e) => { e.preventDefault(); const first = (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>("[role=option]"); first?.focus(); }} onCloseAutoFocus={(e) => { e.preventDefault(); chooserGroup.anchor.focus(); }} onKeyDown={(e) => {
              const options = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>("[role=option]"));
              const idx = options.indexOf(e.target as HTMLButtonElement);
              if (e.key === "ArrowDown") { e.preventDefault(); options[(idx + 1) % options.length]?.focus(); }
              if (e.key === "ArrowUp") { e.preventDefault(); options[idx <= 0 ? options.length - 1 : idx - 1]?.focus(); }
              if (e.key === "Escape") setChooserGroup(null);
            }}>
              <strong id="marker-chooser-label">Choose a rental</strong>
              <div role="listbox" aria-labelledby="marker-chooser-label">
                {chooserGroup.rentals.map((rental) => (
                  <button key={rental.id} role="option" type="button" aria-selected={activeSelectedRental === rental.id} className={styles.chooserOption} onClick={() => { setSelectedRental(rental.id); onSelectRentalRef.current?.(rental.id); setChooserGroup(null); }}>
                    <span>{rental.title}</span>
                    <span className={styles.chooserMeta}>{formatPrice(rental.price)} / month · {(rental.propertyType ?? rental.type).replaceAll(/[-_]/g, " ")}</span>
                    <span className={styles.chooserBadge}>{verificationLabel(rental.verificationStatus)}</span>
                  </button>
                ))}
              </div>
              <RadixPopover.Arrow className={styles.chooserArrow} />
            </RadixPopover.Content>
          </RadixPopover.Portal>
        </RadixPopover.Root>
      )}

      {!decorative && !externallyControlled && <MapSearch onSelect={selectPlace} disabled={mapStatus !== "ready"} />}
      {!decorative && !externallyControlled && <div className={styles.rentalSearch} role="search" aria-label="Rental search">
        <label htmlFor="rental-location">Find rentals</label>
        <input id="rental-location" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Area or landmark" />
        <span>{visibleRentals.length} rentals within {searchRadiusKm} km</span>
      </div>}
      {!decorative && !externallyControlled && <div className={styles.radiusControl}>
        <span id="search-radius-label">Search radius</span>
        <Select aria-label="Search radius" aria-labelledby="search-radius-label" value={String(searchRadiusKm)} onValueChange={(value) => setSearchRadiusKm(Number(value))} options={[{ value: "1", label: "1 km" }, { value: "2", label: "2 km" }, { value: "5", label: "5 km" }]} />
      </div>}
      {!decorative && !externallyControlled && <div className={styles.filterTrigger}>
        <button type="button" aria-haspopup="dialog" aria-expanded={filterOpen} onClick={() => setFilterOpen(true)}>
          Refine rental search
        </button>
      </div>}
      {!decorative && !externallyControlled && visibleRentals.length > 0 ? (
        <aside className={styles.rentalResults} aria-label="Rental listings">
          <strong>Available rentals</strong>
          {visibleRentals.slice(0, 5).map((rental) => (
            <button key={rental.id} type="button" className={activeSelectedRental === rental.id ? styles.selectedRental : ""} onClick={() => { setSelectedRental(rental.id); onSelectRentalRef.current?.(rental.id); mapRef.current?.flyTo({ center: rental.coordinates, zoom: 15, duration: 500 }); }}>
              <span>{rental.title}</span><span>{rental.locality}</span><strong>{formatPrice(rental.price)} / month</strong>
            </button>
          ))}
        </aside>
      ) : !decorative && !externallyControlled ? (
        <aside className={styles.rentalResults} aria-label="Rental listings">
          <strong>{dataStatus === "loading" ? "Loading rentals…" : dataStatus === "error" ? "Rental data unavailable" : "No rentals available"}</strong>
          <span>{dataStatus === "error" ? "Rental records could not be loaded. No sample listings are shown." : dataStatus === "loading" ? "Checking the configured rental data service…" : "No verified rental records were returned for this search area."}</span>
          <button type="button" onClick={() => { setLocationQuery(""); setFilters(DEFAULT_RENTAL_FILTERS); }}>Clear search and filters</button>
        </aside>
      ) : null}
      {!decorative && !externallyControlled && filterOpen && <RentalFilterDialog filters={filters} open onOpenChange={setFilterOpen} onApply={setFilters} matchCount={visibleRentals.length} />}
      {!decorative && <div className={externallyControlled ? styles.srOnly : styles.mapStatus} aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>}

      {!decorative && (assistantControlsTarget ? createPortal(mapControls, assistantControlsTarget) : mapControls)}
    </section>
  );
}
