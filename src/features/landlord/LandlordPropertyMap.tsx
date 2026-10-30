"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AttributionControl, LngLatBounds, Map as MapLibreMap, Marker, Popup, setWorkerUrl } from "maplibre-gl";
import { ArrowUpRight, Building2, CircleAlert, LocateFixed, MapPin, Minus, Plus, RefreshCw } from "lucide-react";
import { METRO_CEBU_CENTER } from "@/components/map/map-geometry";
import styles from "./LandlordPropertyMap.module.css";

setWorkerUrl("/maplibre-gl/maplibre-gl-worker.mjs");

export type LandlordPropertyMapItem = {
  id: string;
  title: string;
  price: number;
  property_type: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  is_available: boolean;
  status: "draft" | "published" | "archived";
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

function getListingStatus(property: LandlordPropertyMapItem) {
  if (property.status === "published") return property.is_available ? "Live · Available" : "Published · Unavailable";
  if (property.reviewed_at && property.rejection_reason) return "Action needed";
  if (property.submitted_at) return "Under review";
  return "Draft";
}

function getStatusTone(property: LandlordPropertyMapItem) {
  if (property.status === "published" && property.is_available) return styles.live;
  if (property.reviewed_at && property.rejection_reason) return styles.actionNeeded;
  if (property.submitted_at) return styles.underReview;
  return styles.draft;
}

function makePopup(property: LandlordPropertyMapItem) {
  const content = document.createElement("div");
  content.className = styles.popup;

  const title = document.createElement("strong");
  title.textContent = property.title;
  const location = document.createElement("span");
  location.textContent = property.address + ", " + property.city;
  const price = document.createElement("span");
  price.textContent = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(Number(property.price)) + " / month";
  const status = document.createElement("span");
  status.className = styles.popupStatus;
  status.textContent = getListingStatus(property);
  content.append(title, location, price, status);
  return content;
}

export function LandlordPropertyMap({ properties, loadError = false }: { properties: LandlordPropertyMapItem[]; loadError?: boolean }) {
  const workspaceRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const locationMarkerRef = useRef<Marker | null>(null);
  const locationRequestRef = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(properties[0]?.id ?? null);
  const [mapError, setMapError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    const workspace = workspaceRef.current;
    const panel = panelRef.current;
    if (!workspace || !panel) return;

    const updatePanelHeight = () => {
      workspace.style.setProperty("--landlord-panel-height", `${Math.ceil(panel.getBoundingClientRect().height)}px`);
    };
    updatePanelHeight();
    const observer = new ResizeObserver(updatePanelHeight);
    observer.observe(panel);
    return () => {
      observer.disconnect();
      workspace.style.removeProperty("--landlord-panel-height");
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const configuredStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
    const styleUrl = () => {
      if (configuredStyleUrl && configuredStyleUrl !== "/styles/osm.json") return configuredStyleUrl;
      return document.documentElement.classList.contains("dark") ? "/styles/osm-dark.json" : "/styles/osm.json";
    };

    let loaded = false;
    let map: MapLibreMap;
    let currentStyle = styleUrl();
    try {
      map = new MapLibreMap({
        container,
        style: currentStyle,
        center: METRO_CEBU_CENTER,
        zoom: 12.5,
        attributionControl: false,
      });
      mapRef.current = map;

      const attributionControl = new AttributionControl({
        compact: true,
        customAttribution: configuredStyleUrl && configuredStyleUrl !== "/styles/osm.json"
          ? undefined
          : '<a href="https://openfreemap.org">OpenFreeMap</a> <a href="https://www.openmaptiles.org/">© OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
      });
      map.addControl(attributionControl, "bottom-left");
      const observer = new MutationObserver(() => {
        const nextStyle = styleUrl();
        if (nextStyle !== currentStyle) {
          currentStyle = nextStyle;
          map.setStyle(nextStyle);
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      const markers: Marker[] = [];
      const bounds = new LngLatBounds();
      for (const property of properties) {
        if (!Number.isFinite(property.longitude) || !Number.isFinite(property.latitude)) continue;
        const markerElement = document.createElement("button");
        markerElement.type = "button";
        markerElement.className = styles.marker;
        markerElement.dataset.status = property.status;
        markerElement.dataset.available = String(property.is_available);
        markerElement.setAttribute("aria-label", property.title + " — " + getListingStatus(property));
        markerElement.title = property.title;
        const glyph = document.createElement("span");
        glyph.className = styles.markerGlyph;
        glyph.textContent = "⌂";
        markerElement.append(glyph);
        markerElement.addEventListener("click", () => setSelectedId(property.id));

        const marker = new Marker({ element: markerElement, anchor: "bottom" })
          .setLngLat([property.longitude, property.latitude])
          .setPopup(new Popup({ offset: 28, closeButton: true }).setDOMContent(makePopup(property)))
          .addTo(map);
        markers.push(marker);
        bounds.extend([property.longitude, property.latitude]);
      }
      markerRefs.current = markers;

      const onLoad = () => {
        loaded = true;
        if (properties.length > 1 && !bounds.isEmpty()) {
          const isMobile = window.matchMedia("(max-width: 767px)").matches;
          map.fitBounds(bounds, {
            padding: isMobile ? { top: 92, right: 28, bottom: 300, left: 28 } : { top: 96, right: 40, bottom: 40, left: 410 },
            maxZoom: 14.5,
            duration: 0,
          });
        } else if (properties.length === 1) {
          map.easeTo({ center: [properties[0].longitude, properties[0].latitude], zoom: 14.5, duration: 0 });
        }
      };
      const onError = () => {
        if (!loaded) setMapError(true);
      };
      map.once("load", onLoad);
      map.on("error", onError);

      return () => {
        observer.disconnect();
        locationRequestRef.current += 1;
        map.off("error", onError);
        locationMarkerRef.current?.remove();
        locationMarkerRef.current = null;
        map.remove();
        markers.forEach((marker) => marker.remove());
        markerRefs.current = [];
        mapRef.current = null;
      };
    } catch {
      setMapError(true);
      return;
    }
  }, [properties]);

  function locateMe() {
    const map = mapRef.current;
    if (!map || locating) return;
    if (!navigator.geolocation) {
      setLocationMessage("Location is not supported by this browser.");
      return;
    }

    const requestId = ++locationRequestRef.current;
    setLocating(true);
    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (locationRequestRef.current !== requestId || mapRef.current !== map) return;
        const center: [number, number] = [coords.longitude, coords.latitude];
        locationMarkerRef.current?.remove();
        locationMarkerRef.current = new Marker({ color: "#2563eb" }).setLngLat(center).addTo(map);
        map.flyTo({ center, zoom: 15.5, duration: 500 });
        setLocating(false);
        setLocationMessage("Your location was found and the map was recentered.");
      },
      () => {
        if (locationRequestRef.current !== requestId || mapRef.current !== map) return;
        setLocating(false);
        setLocationMessage("Could not get your location. Check your browser permission and try again.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }

  function focusProperty(property: LandlordPropertyMapItem) {
    setSelectedId(property.id);
    mapRef.current?.flyTo({ center: [property.longitude, property.latitude], zoom: 15, duration: 600 });
    const markerIndex = properties.findIndex((item) => item.id === property.id);
    if (markerIndex >= 0) markerRefs.current[markerIndex]?.togglePopup();
  }

  return <section ref={workspaceRef} className={styles.mapWorkspace} aria-label="Your property map">
    <div ref={containerRef} className={styles.map} aria-label="Map showing your submitted properties" />
    <div className={styles.mapControls} role="group" aria-label="Map controls">
      <div className={styles.zoomControls}>
        <button className={styles.zoomButton} type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Plus size={20} aria-hidden="true" /></button>
        <button className={styles.zoomButton} type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Minus size={20} aria-hidden="true" /></button>
      </div>
      <button className={styles.locationButton} type="button" aria-label={locating ? "Finding your location" : "Locate me"} title={locating ? "Finding your location" : "Locate me"} disabled={locating} onClick={locateMe}>
        <LocateFixed size={20} aria-hidden="true" />
      </button>
    </div>
    <span className={styles.srOnly} role="status" aria-live="polite">{locationMessage}</span>
    <aside ref={panelRef} className={styles.panel} aria-label="Your properties on the map">
      <header className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <span className={styles.panelIcon}><MapPin size={18} aria-hidden="true" /></span>
          <div>
            <h2>Your property map</h2>
            <p>{loadError ? "Property records unavailable" : properties.length + (properties.length === 1 ? " property" : " properties")}</p>
          </div>
        </div>
      </header>

      {loadError
        ? <div className={styles.emptyState} role="alert">
          <span className={styles.emptyIcon}><CircleAlert size={21} aria-hidden="true" /></span>
          <h3>Properties could not be loaded</h3>
          <p>Refresh the page. If this continues, contact support so we can check your property workspace.</p>
          <button type="button" className={styles.secondaryLink} onClick={() => window.location.reload()} aria-label="Try loading properties again"><RefreshCw size={16} aria-hidden="true" /> Try again</button>
        </div>
        : properties.length === 0
          ? <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><Building2 size={21} aria-hidden="true" /></span>
            <h3>No properties to map yet</h3>
            <p>When you submit a property, its location and review status will appear here.</p>
            <Link href="/list-property" className={styles.primaryLink}><Plus size={17} aria-hidden="true" /> List a property</Link>
          </div>
          : <div className={styles.propertyList}>
            <p className={styles.listIntro}>Only properties in your landlord account appear here.</p>
            {properties.map((property) => <button
              key={property.id}
              type="button"
              className={styles.propertyCard + (selectedId === property.id ? " " + styles.selected : "")}
              aria-pressed={selectedId === property.id}
              onClick={() => focusProperty(property)}
            >
              <span className={styles.propertyHeading}>
                <span className={styles.propertyName}>{property.title}</span>
                <span className={styles.pinDot} data-status={property.status} data-available={String(property.is_available)} aria-hidden="true" />
              </span>
              <span className={styles.propertyAddress}>{property.address}, {property.city}</span>
              <span className={styles.propertyMeta}>
                <span className={styles.statusPill + " " + getStatusTone(property)}>{getListingStatus(property)}</span>
                <span className={styles.propertyType}>{property.property_type.replaceAll("_", " ")}</span>
              </span>
              <span className={styles.propertyFooter}>
                <strong>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(Number(property.price))}<small> / month</small></strong>
                <span>View on map <ArrowUpRight size={14} aria-hidden="true" /></span>
              </span>
            </button>)}
          </div>}

      {mapError && <p className={styles.mapNotice} role="status">The map tiles could not be loaded. Your property details are still available above.</p>}
    </aside>
  </section>;
}
