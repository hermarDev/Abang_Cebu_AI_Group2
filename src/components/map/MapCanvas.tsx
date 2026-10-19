"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import styles from "./MapCanvas.module.css";

// Serve MapLibre's worker files together so its worker can resolve the shared module.
setWorkerUrl("/maplibre-gl/maplibre-gl-worker.mjs");

const METRO_CEBU_CENTER: [number, number] = [123.8854, 10.3157];
const DEFAULT_ZOOM = 13;
const LOCATION_ZOOM = 15.5;
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

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const locationRequestRef = useRef(0);
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [statusMessage, setStatusMessage] = useState(
    "Map centered on Metro Cebu. Use Locate Me to find your position.",
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    let mapLoaded = false;
    let map: MapLibreMap;

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
      mapLoaded = true;
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

    map.once("load", onLoad);
    map.on("error", onMapError);

    return () => {
      active = false;
      locationRequestRef.current += 1;
      markerRef.current?.remove();
      markerRef.current = null;
      map.off("error", onMapError);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const locateMe = useCallback(() => {
    const map = mapRef.current;
    if (!map || locationStatus === "locating") return;
    const requestId = ++locationRequestRef.current;

    if (!navigator.geolocation) {
      markerRef.current?.remove();
      markerRef.current = null;
      setLocationStatus("fallback");
      setStatusMessage(
        "Location is not supported by this browser. The map remains centered on Metro Cebu.",
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
        markerRef.current = new Marker({ color: "#047857" })
          .setLngLat(center)
          .addTo(currentMap);
        currentMap.flyTo({ center, zoom: LOCATION_ZOOM, duration: 1200 });
        setLocationStatus("located");
        setStatusMessage("Your location was found and the map was recentered.");
      },
      (error) => {
        if (locationRequestRef.current !== requestId) return;
        markerRef.current?.remove();
        markerRef.current = null;
        const currentMap = mapRef.current;
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
            "Could not get your location. The map remains centered on Metro Cebu.",
        );
      },
      LOCATION_OPTIONS,
    );
  }, [locationStatus]);

  const resetToMetroCebu = useCallback(() => {
    // Ignore any geolocation callback that arrives after the user resets the map.
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
    const map = mapRef.current;
    if (!map) return;
    const handleMapClick = () => undefined;
    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [mapStatus]);

  return (
    <section className={styles.mapRoot} aria-label="Metro Cebu map">
      <div
        ref={containerRef}
        className={styles.mapCanvas}
        role="region"
        aria-label="Interactive map centered on Metro Cebu"
        aria-busy={mapStatus === "loading"}
      />

      {mapStatus === "unavailable" && (
        <div className={styles.mapFallback} role="status">
          <strong>Map unavailable</strong>
          <span>Metro Cebu remains the default search area.</span>
        </div>
      )}

      <div className={styles.mapStatus} aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      <div className={styles.mapControls}>
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
