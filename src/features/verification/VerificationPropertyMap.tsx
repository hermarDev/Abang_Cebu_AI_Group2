"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AttributionControl, LngLatBounds, Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import { METRO_CEBU_CENTER } from "@/components/map/map-geometry";
import { loadPendingVerificationMap, mapCoordinates } from "./verification-map-data";
import type { VerificationQueueItem } from "./VerificationQueue";

setWorkerUrl("/maplibre-gl/maplibre-gl-worker.mjs");

const queueHref = (id: string) => `/verification/queue?status=pending_verification&propertyId=${encodeURIComponent(id)}`;
const address = (item: VerificationQueueItem) => [item.streetAddress, item.barangay, item.city].filter(Boolean).join(", ");

export function VerificationMapList({ items, selectedId, onSelect }: { items: VerificationQueueItem[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {items.map((item) => {
        const coords = mapCoordinates(item);
        const selected = item.id === selectedId;
        return (
          <li key={item.id} className="rounded-xl border border-border bg-card p-3">
            <button type="button" aria-pressed={selected} onClick={() => onSelect(item.id)} className={`min-h-11 w-full rounded-lg px-2 text-left font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "bg-action/10 text-action" : ""}`}>
              {item.title || "Untitled property"}
            </button>
            <p className="m-0 px-2 text-sm text-muted-foreground">{address(item) || "Address unavailable"}</p>
            <p className="m-0 px-2 text-xs text-muted-foreground">{coords ? `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}` : "Location unavailable"}</p>
            <Link href={queueHref(item.id)} className="mt-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Open verification
            </Link>
              {coords && selected && (
              <a href={`https://www.openstreetmap.org/directions?to=${coords[1]}%2C${coords[0]}`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-muted-foreground underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                Directions (shares this location with OpenStreetMap)
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function VerificationPropertyMap({ userId }: { userId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [items, setItems] = useState<VerificationQueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tileError, setTileError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    loadPendingVerificationMap(userId, controller.signal)
      .then((loaded) => { setError(null); setItems(loaded); })
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load the map."); });
    return () => controller.abort();
  }, [userId, reload]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !items) return;
    const dark = document.documentElement.classList.contains("dark");
    let map: MapLibreMap | null = null;
    let failed = false;
    try {
      map = new MapLibreMap({ container, style: dark ? "/styles/osm-dark.json" : "/styles/osm.json", center: METRO_CEBU_CENTER, zoom: 12, attributionControl: false });
      map.addControl(new AttributionControl({ compact: true }), "bottom-left");
      map.on("error", () => setTileError(true));
    } catch {
      failed = true;
    }
    if (failed || !map) {
      queueMicrotask(() => setTileError(true));
      return;
    }
    const mapInstance = map;
    mapRef.current = mapInstance;
    const bounds = new LngLatBounds();
    const markers: Marker[] = [];
    for (const item of items) {
      const coords = mapCoordinates(item);
      if (!coords) continue;
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `Select ${item.title || "property"}`);
      el.setAttribute("aria-pressed", item.id === selectedId ? "true" : "false");
      el.className = `size-11 rounded-full border-2 border-background shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${item.id === selectedId ? "bg-action text-action-foreground" : "bg-muted text-muted-foreground"}`;
      el.textContent = "●";
      el.addEventListener("click", () => setSelectedId(item.id));
      markers.push(new Marker({ element: el }).setLngLat(coords).addTo(map));
      bounds.extend(coords);
    }
    if (!bounds.isEmpty()) mapInstance.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 });
    return () => { markers.forEach((m) => m.remove()); mapInstance.remove(); mapRef.current = null; };
  }, [items, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const dark = document.documentElement.classList.contains("dark");
    map.setStyle(dark ? "/styles/osm-dark.json" : "/styles/osm.json");
    const observer = new MutationObserver(() => {
      const nextDark = document.documentElement.classList.contains("dark");
      map.setStyle(nextDark ? "/styles/osm-dark.json" : "/styles/osm.json");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [items]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-h-[50dvh] overflow-hidden rounded-2xl border border-border">
        <div ref={containerRef} className="h-[50dvh] min-h-80 w-full touch-pan-y" role="region" aria-label="Pending properties map" />
      </div>
      <details open className="min-w-0 lg:max-h-[70dvh] lg:overflow-y-auto">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Pending properties</summary>
      <section aria-label="Pending properties" className="grid content-start gap-3">
        <button type="button" onClick={() => { setItems(null); setError(null); setReload((n) => n + 1); }} className="min-h-11 justify-self-start rounded-lg px-2 font-semibold text-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Refresh properties</button>
        {error ? (
          <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {error} Some pending properties may be missing.
            <button type="button" onClick={() => { setItems(null); setReload((n) => n + 1); }} className="ml-2 min-h-11 font-semibold underline">Retry</button>
          </div>
        ) : items === null ? (
          <p role="status" className="m-0 text-sm text-muted-foreground">Loading pending properties…</p>
        ) : items.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">No properties are pending verification.</p>
        ) : (
          <>
            <p role="status" className="m-0 text-sm text-muted-foreground">{items.length} pending. List is loaded in pages and may change; refresh to update.</p>
            {tileError && <p role="status" className="m-0 text-sm text-muted-foreground">Map tiles are unavailable. Use the list.</p>}
            <VerificationMapList items={items} selectedId={selectedId} onSelect={setSelectedId} />
          </>
        )}
      </section>
      </details>
    </div>
  );
}
