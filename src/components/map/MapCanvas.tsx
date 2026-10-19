"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, Popup, setWorkerUrl } from "maplibre-gl";
import MapSearch, { type SearchSelection } from "./MapSearch";
import { listingsToPriceFeatures, type ListingPriceFeature, type ViewportBounds } from "@/lib/search/landmark-search";
import type { ListingSearchAdapter } from "@/lib/search/search-adapter";
import { subscribeToListingHighlights } from "@/components/map/listing-highlight";
import styles from "./MapCanvas.module.css";

// Serve MapLibre's worker files together so its worker can resolve the shared module.
setWorkerUrl("/maplibre-gl/maplibre-gl-worker.mjs");

const METRO_CEBU_CENTER: [number, number] = [123.8854, 10.3157];
const DEFAULT_ZOOM = 13;
const LOCATION_ZOOM = 15.5;
const SEARCH_ZOOM = 15;
const SEARCH_DEBOUNCE_MS = 350;
const LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 60_000,
};

const LOCATION_ERROR_MESSAGES: Record<number, string> = {
  1: "Location permission was denied. The map remains centered on Metro Cebu.",
  2: "Your location is unavailable. The map remains centered on Metro Cebu.",
  3: "Location timed out. The map remains centered on Metro Cebu.",
};

type MapStatus = "loading" | "ready" | "unavailable";
type LocationStatus = "idle" | "locating" | "located" | "fallback";
type SearchStatus = "idle" | "searching" | "ready" | "empty" | "error";

// Until the authorized PostGIS RPC and its response contract are confirmed,
// render no pretend listings. Wire the real service through this interface.
const listingSearchAdapter: ListingSearchAdapter | null = null;

function formatPrice(currency: string, price: number, rentalPeriod: string): string {
  const formatted = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
  return `${formatted}${rentalPeriod === "month" ? "/mo" : `/${rentalPeriod}`}`;
}

function createPriceMarker(feature: ListingPriceFeature, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = styles.priceMarker;
  button.setAttribute("aria-label", `${feature.properties.title}, ${formatPrice(feature.properties.currency, feature.properties.price, feature.properties.rentalPeriod)}`);
  button.textContent = formatPrice(feature.properties.currency, feature.properties.price, feature.properties.rentalPeriod);
  button.addEventListener("click", onClick);
  return button;
}

function setMarkerActive(marker: Marker, active: boolean): void {
  marker.getElement().classList.toggle(styles.priceMarkerActive, active);
}

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const markerElementsRef = useRef<Map<string, Marker>>(new Map());
  const activeListingIdRef = useRef<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchTermRef = useRef("");
  const activeLandmarkIdRef = useRef<string | undefined>(undefined);
  const searchTimerRef = useRef<number | null>(null);
  const latestSearchIdRef = useRef(0);
  const latestBoundsRef = useRef<ViewportBounds | null>(null);
  const locationRequestRef = useRef(0);
  const searchStatusRef = useRef<SearchStatus>("idle");
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [statusMessage, setStatusMessage] = useState(
    "Map centered on Metro Cebu. Use Locate Me to find your position.",
  );
  const [resultCount, setResultCount] = useState(0);

  const setSearchState = useCallback((status: SearchStatus, message: string) => {
    searchStatusRef.current = status;
    setSearchStatus(status);
    setStatusMessage(message);
  }, []);

  const clearListingMarkers = useCallback(() => {
    for (const marker of markerElementsRef.current.values()) marker.remove();
    markerElementsRef.current.clear();
    setResultCount(0);
  }, []);

  const searchViewport = useCallback(async (bounds: ViewportBounds) => {
    latestBoundsRef.current = bounds;
    const searchId = ++latestSearchIdRef.current;
    searchAbortRef.current?.abort();

    if (!listingSearchAdapter) {
      clearListingMarkers();
      setSearchState("idle", "Map ready. Search is waiting for the viewport service adapter.");
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearchState("searching", "Searching this map area…");

    try {
      const listings = await listingSearchAdapter.searchViewport({
        bounds,
        query: searchTermRef.current,
        ...(activeLandmarkIdRef.current ? { landmarkId: activeLandmarkIdRef.current } : {}),
        signal: controller.signal,
      });
      if (controller.signal.aborted || searchId !== latestSearchIdRef.current) return;

      const features = listingsToPriceFeatures(listings);
      clearListingMarkers();
      const map = mapRef.current;
      if (!map) return;

      for (const feature of features) {
        const listingId = String(feature.id);
        const marker = new Marker({
          element: createPriceMarker(feature, () => {
            const popup = new Popup({ closeButton: true, closeOnClick: true, maxWidth: "18rem" })
              .setLngLat(feature.geometry.coordinates)
              .setHTML("");
            const popupContent = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = feature.properties.title;
            const price = document.createElement("p");
            price.textContent = formatPrice(
              feature.properties.currency,
              feature.properties.price,
              feature.properties.rentalPeriod,
            );
            popupContent.append(title, price);
            popup.setDOMContent(popupContent).addTo(map);
          }),
        })
          .setLngLat(feature.geometry.coordinates)
          .addTo(map);
        markerElementsRef.current.set(listingId, marker);
        setMarkerActive(marker, listingId === activeListingIdRef.current);
      }

      setResultCount(features.length);
      setSearchState(
        features.length === 0 ? "empty" : "ready",
        features.length === 0
          ? "No rentals found in this area. Pan the map to explore nearby."
          : `${features.length} rental${features.length === 1 ? "" : "s"} in this map area.`,
      );
    } catch {
      if (controller.signal.aborted || searchId !== latestSearchIdRef.current) return;
      clearListingMarkers();
      setSearchState("error", "Rentals could not be loaded. Pan the map to try again.");
    }
  }, [clearListingMarkers, setSearchState]);

  const scheduleViewportSearch = useCallback((map: MapLibreMap, delay = SEARCH_DEBOUNCE_MS) => {
    if (searchStatusRef.current === "idle") return;
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchAbortRef.current?.abort();
    const rawBounds = map.getBounds().toArray().flat();
    const bounds = rawBounds as ViewportBounds;
    searchTimerRef.current = window.setTimeout(() => void searchViewport(bounds), delay);
  }, [searchViewport]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    let map: MapLibreMap;

    const unsubscribeListingHighlights = subscribeToListingHighlights(
      markerElementsRef.current,
      activeListingIdRef,
      setMarkerActive,
    );

    try {
      map = new MapLibreMap({
        container,
        style: "/styles/osm.json",
        center: METRO_CEBU_CENTER,
        zoom: DEFAULT_ZOOM,
        bearing: 0,
        pitch: 0,
      });
    } catch {
      unsubscribeListingHighlights();
      const fallbackTimer = window.setTimeout(() => {
        setMapStatus("unavailable");
        setStatusMessage(
          "The interactive map is unavailable in this browser. Metro Cebu remains the default area.",
        );
      }, 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    mapRef.current = map;

    const onLoad = () => {
      if (active) {
        setMapStatus("ready");
        window.setTimeout(() => map.resize(), 0);
      }
    };
    const onMapError = () => {
      if (active && searchStatusRef.current === "idle") {
        setMapStatus("unavailable");
        setStatusMessage(
          "The map could not be loaded. Check your connection and try again.",
        );
      }
    };
    const onMoveEnd = () => scheduleViewportSearch(map);

    map.once("load", onLoad);
    map.on("error", onMapError);
    map.on("moveend", onMoveEnd);

    return () => {
      active = false;
      locationRequestRef.current += 1;
      latestSearchIdRef.current += 1;
      searchAbortRef.current?.abort();
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
      markerRef.current?.remove();
      markerRef.current = null;
      for (const marker of markerElementsRef.current.values()) marker.remove();
      markerElementsRef.current.clear();
      unsubscribeListingHighlights();
      map.off("error", onMapError);
      map.off("moveend", onMoveEnd);
      map.remove();
      mapRef.current = null;
    };
  }, [scheduleViewportSearch]);

  const startViewportSearch = useCallback((map: MapLibreMap, bounds: ViewportBounds) => {
    searchStatusRef.current = "ready";
    latestBoundsRef.current = bounds;
    setSearchState("searching", "Searching this map area…");
    void searchViewport(bounds);
    map.once("moveend", () => scheduleViewportSearch(map, 0));
  }, [scheduleViewportSearch, searchViewport, setSearchState]);

  const handleSearch = useCallback((selection: SearchSelection) => {
    const map = mapRef.current;
    if (!map) {
      setStatusMessage("The map is still loading. Try your search again shortly.");
      return;
    }

    locationRequestRef.current += 1;
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchAbortRef.current?.abort();

    if ("landmark" in selection) {
      searchTermRef.current = selection.landmark.name;
      activeLandmarkIdRef.current = selection.landmark.id;
      map.flyTo({
        center: selection.landmark.coordinates,
        zoom: SEARCH_ZOOM,
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1000,
        essential: false,
      });
      const bounds = map.getBounds().toArray().flat() as ViewportBounds;
      startViewportSearch(map, bounds);
      return;
    }

    searchTermRef.current = selection.query;
    activeLandmarkIdRef.current = undefined;
    const bounds = map.getBounds().toArray().flat() as ViewportBounds;
    startViewportSearch(map, bounds);
  }, [startViewportSearch]);

  const locateMe = useCallback(() => {
    const map = mapRef.current;
    if (!map || locationStatus === "locating") return;
    const requestId = ++locationRequestRef.current;

    if (!navigator.geolocation) {
      setLocationStatus("fallback");
      setStatusMessage("Location is unavailable in this browser. The map remains centered on Metro Cebu.");
      return;
    }

    setLocationStatus("locating");
    setStatusMessage("Finding your location…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId !== locationRequestRef.current) return;
        const coordinates: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        map.flyTo({ center: coordinates, zoom: LOCATION_ZOOM, duration: 1000 });
        markerRef.current?.remove();
        markerRef.current = new Marker({ color: "#047857" })
          .setLngLat(coordinates)
          .addTo(map);
        setLocationStatus("located");
        setStatusMessage("Showing your approximate location. Location is used only for this map view.");
      },
      (error) => {
        if (requestId !== locationRequestRef.current) return;
        setLocationStatus("fallback");
        setStatusMessage(
          LOCATION_ERROR_MESSAGES[error.code] ??
            "Could not get your location. The map remains centered on Metro Cebu.",
        );
      },
      LOCATION_OPTIONS,
    );
  }, [locationStatus]);

  const resetToMetroCebu = useCallback(() => {
    locationRequestRef.current += 1;
    mapRef.current?.flyTo({
      center: METRO_CEBU_CENTER,
      zoom: DEFAULT_ZOOM,
      bearing: 0,
      pitch: 0,
      duration: 500,
    });
    markerRef.current?.remove();
    markerRef.current = null;
    setLocationStatus("idle");
    setStatusMessage("Map centered on Metro Cebu.");
  }, []);

  useEffect(() => {
    if (!latestBoundsRef.current || mapStatus !== "ready") return;
    const rawBounds = mapRef.current?.getBounds().toArray().flat();
    if (rawBounds?.length === 4) void searchViewport(rawBounds as ViewportBounds);
  }, [mapStatus, searchViewport]);

  const searchLabel = searchStatus === "searching"
    ? "Searching this map area…"
    : searchStatus === "error"
      ? "Search failed"
      : searchStatus === "empty"
        ? "No rentals in this map area"
        : `${resultCount} rentals in this map area`;

  return (
    <section className={styles.mapRoot} aria-label="Metro Cebu rental map">
      <div
        ref={containerRef}
        className={styles.mapCanvas}
        role="region"
        aria-label="Interactive map centered on Metro Cebu. Pan or zoom to update current-area search results."
        aria-busy={mapStatus === "loading" || searchStatus === "searching"}
      />

      {mapStatus === "unavailable" && (
        <div className={styles.mapFallback} role="status">
          <strong>Map unavailable</strong>
          <span>Metro Cebu remains the default search area.</span>
        </div>
      )}

      <MapSearch onSearch={handleSearch} />

      <div className={styles.resultsSummary}>
        <span className={styles.resultDot} aria-hidden="true" />
        <span>{searchLabel}</span>
      </div>

      <div className={styles.mapStatus} aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      <div className={styles.mapControls}>
        <button
          className={styles.controlButton}
          type="button"
          onClick={locateMe}
          disabled={mapStatus !== "ready" || locationStatus === "locating"}
          aria-label={locationStatus === "locating" ? "Finding your location" : "Locate me"}
        >
          {locationStatus === "locating" ? "Locating…" : "Locate me"}
        </button>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={resetToMetroCebu}
          disabled={mapStatus !== "ready"}
        >
          Metro Cebu
        </button>
      </div>
    </section>
  );
}
