"use client";

import type { CSSProperties } from "react";
import MapCanvasLoader from "@/components/map/MapCanvasLoader";
import { useFinderTheme } from "@/features/map/useFinderTheme";

export function AccountMapBackground() {
  const { resolvedTheme } = useFinderTheme();
  const hasCustomMapStyle = Boolean(process.env.NEXT_PUBLIC_MAP_STYLE_URL && process.env.NEXT_PUBLIC_MAP_STYLE_URL !== "/styles/osm.json");

  return <div className="fixed inset-0 z-0 overflow-hidden" style={{ "--results-sheet-height": "0px" } as CSSProperties}>
    <MapCanvasLoader decorative dataStatus="ready" resolvedTheme={resolvedTheme} showAttribution={hasCustomMapStyle} />
  </div>;
}
