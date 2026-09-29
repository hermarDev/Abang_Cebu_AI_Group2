"use client";

import { useEffect, useRef } from "react";
import { Map, NavigationControl, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { siteConfig } from "@/config/site";
import { type MapContainerProps } from "./types";

export function MapContainer({
  markers = [],
  center = [siteConfig.cebuCoordinates.lng, siteConfig.cebuCoordinates.lat],
  zoom = siteConfig.cebuCoordinates.zoom,
  className = "relative h-full w-full min-h-[500px]",
  styleUrl = siteConfig.defaultMapStyle,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. Initialize MapLibre GL instance
    const map = new Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center,
      zoom,
    });

    // 2. Add navigation zoom controls
    map.addControl(
      new NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    // 3. Populate initial markers once the style loads
    map.on("load", () => {
      // Clear any prior markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      markers.forEach((item) => {
        const popupContent = `
          <div style="font-family: sans-serif; padding: 4px;">
            <div style="font-weight: 700; font-size: 14px; color: #111827;">${item.title}</div>
            ${item.price ? `<div style="color: #2563eb; font-weight: 600; margin-top: 2px;">${item.currency || "PHP"} ${item.price.toLocaleString()} / mo</div>` : ""}
            ${item.address ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${item.address}</div>` : ""}
          </div>
        `;

        const popup = new Popup({ offset: 25 }).setHTML(popupContent);

        const marker = new Marker({ color: "#2563eb" })
          .setLngLat(item.coordinates)
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    });

    mapRef.current = map;

    // 4. CRITICAL: Clean up WebGL context and event listeners on unmount
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom, styleUrl, markers]);

  return <div ref={mapContainerRef} className={className} />;
}
