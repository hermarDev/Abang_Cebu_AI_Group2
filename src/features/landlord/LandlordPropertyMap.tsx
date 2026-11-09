"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AttributionControl, LngLatBounds, Map as MapLibreMap, Marker, Popup, setWorkerUrl } from "maplibre-gl";
import { ArrowUpRight, Building2, ChevronLeft, ChevronRight, CircleAlert, ImageOff, LocateFixed, MapPin, Minus, Plus, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
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
  status: "draft" | "pending" | "rejected" | "published" | "approved" | "archived";
  editHref?: string | null;
  imageUrls?: string[];
  description?: string | null;
  amenities?: string[];
};

function getListingStatus(property: LandlordPropertyMapItem) {
  if (property.status === "pending") return "Pending review";
  if (property.status === "rejected") return "Changes requested";
  if (property.status === "published" || property.status === "approved") return property.is_available ? "Published · Available" : "Published · Unavailable";
  if (property.status === "archived") return "Archived";
  return "Draft";
}

function getStatusTone(property: LandlordPropertyMapItem) {
  if (property.status === "pending") return styles.underReview;
  if (property.status === "rejected") return styles.actionNeeded;
  if ((property.status === "published" || property.status === "approved") && property.is_available) return styles.live;
  return styles.draft;
}

const formatPrice = (price: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(Number(price));

const POPUP_OFFSETS = {
  center: [0, 0] as [number, number],
  top: [0, 14] as [number, number],
  "top-left": [0, 14] as [number, number],
  "top-right": [0, 14] as [number, number],
  bottom: [0, -34] as [number, number],
  "bottom-left": [0, -34] as [number, number],
  "bottom-right": [0, -34] as [number, number],
  left: [18, -18] as [number, number],
  right: [-18, -18] as [number, number],
};

function dedupeImageUrls(urls?: string[]): string[] {
  if (!Array.isArray(urls)) return [];
  const seen = new Set<string>();
  return urls.filter((url) => {
    if (typeof url !== "string" || !url) return false;
    const clean = url.split("?")[0];
    const leaf = clean.split("/").pop()?.toLowerCase() ?? clean;
    const key = /^[0-9a-f]{64}\.(jpg|png|webp)$/i.test(leaf) ? leaf : clean;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatCategoryLabel(raw: string): string {
  const cleaned = (raw || "Property").replaceAll(/[-_]/g, " ").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function makePopup(property: LandlordPropertyMapItem, onExpand?: (id: string) => void, onClose?: () => void) {
  const content = document.createElement("article");
  content.className = styles.popup;
  content.setAttribute("aria-label", "Preview of " + property.title);
  const stopMapEvent = (e: Event) => { e.stopPropagation(); };
  for (const evt of ["click", "dblclick", "wheel", "pointerdown", "touchstart"]) {
    content.addEventListener(evt, stopMapEvent);
  }

  const photos = dedupeImageUrls(property.imageUrls);
  let currentIdx = 0;

  const frame = document.createElement("div");
  frame.className = styles.popupPhotoFrame;

  const renderNoPhoto = () => {
    frame.replaceChildren();
    const empty = document.createElement("div");
    empty.className = styles.popupNoPhoto;
    empty.textContent = "No photo available";
    frame.append(empty);
  };

  const countText = document.createElement("span");
  const updateCountText = (idx: number) => {
    countText.textContent = photos.length === 0 ? "No photos" : photos.length === 1 ? "1 photo" : `${idx + 1} of ${photos.length} photos`;
  };
  updateCountText(0);

  if (photos[0]) {
    const img = document.createElement("img");
    img.src = photos[0];
    img.alt = "Photo of " + property.title;
    img.className = styles.popupPhoto;
    img.addEventListener("error", renderNoPhoto);
    frame.append(img);

    if (photos.length > 1) {
      const setPhoto = (next: number) => {
        currentIdx = (next + photos.length) % photos.length;
        img.src = photos[currentIdx];
        updateCountText(currentIdx);
      };
      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = `${styles.popupPhotoNav} ${styles.popupPhotoPrev}`;
      prevBtn.setAttribute("aria-label", "Previous photo");
      prevBtn.textContent = "‹";
      prevBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); setPhoto(currentIdx - 1); });
      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = `${styles.popupPhotoNav} ${styles.popupPhotoNext}`;
      nextBtn.setAttribute("aria-label", "Next photo");
      nextBtn.textContent = "›";
      nextBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); setPhoto(currentIdx + 1); });
      frame.append(prevBtn, nextBtn);
    }
  } else {
    renderNoPhoto();
  }

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = styles.popupClose;
  closeBtn.setAttribute("aria-label", "Close " + property.title + " preview");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); onClose?.(); });

  const body = document.createElement("div");
  body.className = styles.popupBody;

  const metaRow = document.createElement("div");
  metaRow.className = styles.popupMetaRow;
  const metaBadges = document.createElement("div");
  metaBadges.className = styles.popupMetaBadges;
  const category = document.createElement("span");
  category.className = styles.popupCategory;
  category.textContent = formatCategoryLabel(property.property_type);
  const status = document.createElement("span");
  status.className = `${styles.statusPill} ${getStatusTone(property)}`;
  status.textContent = getListingStatus(property);
  metaBadges.append(category, status);

  const photoCountWrap = document.createElement("span");
  photoCountWrap.className = styles.popupPhotoCount;
  photoCountWrap.append(countText);
  metaRow.append(metaBadges, photoCountWrap);

  const title = document.createElement("strong");
  title.className = styles.popupTitle;
  title.textContent = property.title;
  title.title = property.title;

  const location = document.createElement("span");
  location.className = styles.popupLocation;
  const fullLocation = [property.address, property.city].filter(Boolean).join(", ");
  location.textContent = fullLocation;
  location.title = fullLocation;

  const priceRow = document.createElement("div");
  priceRow.className = styles.popupPriceRow;
  const price = document.createElement("strong");
  price.className = styles.popupPrice;
  price.textContent = formatPrice(property.price);
  const basis = document.createElement("span");
  basis.className = styles.popupBasis;
  basis.textContent = "/ month";
  priceRow.append(price, basis);

  const actions = document.createElement("div");
  actions.className = styles.popupActions;
  if (!property.editHref) actions.dataset.singleAction = "true";

  const expand = document.createElement("button");
  expand.type = "button";
  expand.className = styles.popupExpandButton;
  expand.setAttribute("aria-label", "Expand " + property.title);
  expand.textContent = "View details ↗";
  expand.addEventListener("click", () => onExpand?.(property.id));
  actions.append(expand);

  if (property.editHref) {
    const edit = document.createElement("a");
    edit.href = property.editHref;
    edit.className = styles.popupEditLink;
    edit.textContent = "Edit submission";
    actions.append(edit);
  }

  body.append(metaRow, title, location, priceRow, actions);
  content.append(frame, closeBtn, body);
  return content;
}

export function LandlordPropertyMap({ properties, loadError = false, initialSelectedId = null }: { properties: LandlordPropertyMapItem[]; loadError?: boolean; initialSelectedId?: string | null }) {
  const workspaceRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const locationMarkerRef = useRef<Marker | null>(null);
  const locationRequestRef = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId && properties.some((property) => property.id === initialSelectedId) ? initialSelectedId : (properties[0]?.id ?? null));
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const expandedProperty = properties.find((property) => property.id === expandedPropertyId);
  const openExpanded = useCallback((id: string) => { setActivePhotoIndex(0); setExpandedPropertyId(id); }, []);
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

        const popup = new Popup({ offset: POPUP_OFFSETS, maxWidth: "none", closeButton: false, closeOnClick: false });
        popup.setDOMContent(makePopup(property, openExpanded, () => popup.remove()));
        const marker = new Marker({ element: markerElement, anchor: "bottom" })
          .setLngLat([property.longitude, property.latitude])
          .setPopup(popup)
          .addTo(map);
        markers.push(marker);
        bounds.extend([property.longitude, property.latitude]);
      }
      markerRefs.current = markers;

      let attributionInitialized = false;
      const onLoad = () => {
        loaded = true;
        if (!attributionInitialized) {
          attributionInitialized = true;
          const details = container.querySelector<HTMLDetailsElement>(".maplibregl-ctrl-attrib.maplibregl-compact-show");
          details?.querySelector<HTMLElement>("summary")?.click();
        }
        const selectedIndex = initialSelectedId ? properties.findIndex((property) => property.id === initialSelectedId) : -1;
        if (selectedIndex >= 0) {
          const selected = properties[selectedIndex];
          map.easeTo({ center: [selected.longitude, selected.latitude], offset: [0, 75], zoom: 15, duration: 0 });
          markerRefs.current[selectedIndex]?.togglePopup();
        } else if (properties.length > 1 && !bounds.isEmpty()) {
          const isMobile = window.matchMedia("(max-width: 767px)").matches;
          map.fitBounds(bounds, {
            padding: isMobile ? { top: 92, right: 28, bottom: 300, left: 28 } : { top: 96, right: 40, bottom: 40, left: 410 },
            maxZoom: 14.5,
            duration: 0,
          });
        } else if (properties.length === 1) {
          map.easeTo({ center: [properties[0].longitude, properties[0].latitude], offset: [0, 75], zoom: 14.5, duration: 0 });
          markerRefs.current[0]?.togglePopup();
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
      const timer = window.setTimeout(() => setMapError(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [properties, initialSelectedId, openExpanded]);

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
    mapRef.current?.flyTo({ center: [property.longitude, property.latitude], offset: [0, 75], zoom: 15, duration: 600 });
    const markerIndex = properties.findIndex((item) => item.id === property.id);
    markerRefs.current.forEach((m, idx) => {
      if (idx !== markerIndex && m.getPopup()?.isOpen()) m.togglePopup();
    });
    if (markerIndex >= 0 && !markerRefs.current[markerIndex]?.getPopup()?.isOpen()) {
      markerRefs.current[markerIndex]?.togglePopup();
    }
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
            <p>Your properties and their locations will appear here.</p>

          </div>
          : <div className={styles.propertyList}>
            <p className={styles.listIntro}>Only properties in your landlord account appear here.</p>
            {properties.map((property) => <div key={property.id} className={styles.propertyItem}><button
              type="button"
              className={styles.propertyCard + (selectedId === property.id ? " " + styles.selected : "")}
              aria-pressed={selectedId === property.id}
              onClick={() => focusProperty(property)}
            >
              {property.imageUrls?.[0] && <Image src={property.imageUrls[0]} alt={"Photo of " + property.title} width={640} height={360} unoptimized className={styles.cardPhoto} />}
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
                <strong>{formatPrice(property.price)}<small> / month</small></strong>
                <span>View on map <ArrowUpRight size={14} aria-hidden="true" /></span>
              </span>
            </button>
            <div className={styles.propertyActions} data-single-action={!property.editHref || undefined}>
              <button type="button" className={styles.cardPrimaryAction} aria-label={"Expand " + property.title} onClick={() => openExpanded(property.id)}><span>View details</span> <ArrowUpRight size={15} aria-hidden="true" /></button>
              {property.editHref && <Link href={property.editHref} className={styles.secondaryLink}>Edit submission</Link>}
            </div>
            </div>)}
          </div>}

      {mapError && <p className={styles.mapNotice} role="status">The map tiles could not be loaded. Your property details are still available above.</p>}
    </aside>
    {expandedProperty && <Modal open onClose={() => setExpandedPropertyId(null)} title={expandedProperty.title} description={expandedProperty.address + ", " + expandedProperty.city} className={styles.expandModal}>
      <ExpandedPropertyView property={expandedProperty} photoIndex={activePhotoIndex} onPhotoIndexChange={setActivePhotoIndex} />
    </Modal>}
  </section>;
}

export function ExpandedPropertyView({ property, photoIndex, onPhotoIndexChange }: { property: LandlordPropertyMapItem; photoIndex: number; onPhotoIndexChange: (index: number) => void }) {
  const urls = dedupeImageUrls(property.imageUrls);
  const index = Math.min(photoIndex, Math.max(urls.length - 1, 0));
  const go = (delta: number) => onPhotoIndexChange((index + delta + urls.length) % urls.length);
  return <div className={styles.expandBody}>
    {urls.length ? <div className={styles.viewer}>
      <Image src={urls[index]} alt={"Photo " + (index + 1) + " of " + property.title} width={1200} height={900} unoptimized className={styles.viewerPhoto} />
      <span className={styles.photoBadge}>{index + 1} / {urls.length}</span>
      {urls.length > 1 && <>
        <button type="button" className={styles.viewerPrev} aria-label="Previous photo" onClick={() => go(-1)}><ChevronLeft size={20} aria-hidden="true" /></button>
        <button type="button" className={styles.viewerNext} aria-label="Next photo" onClick={() => go(1)}><ChevronRight size={20} aria-hidden="true" /></button>
      </>}
    </div> : <div className={styles.noPhotos}><ImageOff size={22} aria-hidden="true" /><span>No photos uploaded</span></div>}
    {urls.length > 1 && <div className={styles.thumbs}>{urls.map((url, i) => <button key={url} type="button" className={styles.thumb} aria-label={"Show photo " + (i + 1)} aria-current={i === index} onClick={() => onPhotoIndexChange(i)}><Image src={url} alt="" width={112} height={112} unoptimized /></button>)}</div>}
    <div className={styles.propertyMeta}>
      <span className={styles.statusPill + " " + getStatusTone(property)}>{getListingStatus(property)}</span>
      <span className={styles.propertyType}>{property.property_type.replaceAll("_", " ")}</span>
    </div>
    <strong className={styles.expandPrice}>{formatPrice(property.price)}<small> / month</small></strong>
    <p className={styles.expandText}>{property.address}, {property.city}</p>
    {property.description && <p className={styles.expandText}>{property.description}</p>}
    {property.amenities?.length ? <ul className={styles.amenities}>{property.amenities.map((amenity) => <li key={amenity}>{amenity}</li>)}</ul> : null}
    {property.editHref && <Link href={property.editHref} className={styles.secondaryLink}>Edit submission</Link>}
  </div>;
}