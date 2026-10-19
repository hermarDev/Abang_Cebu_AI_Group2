"use client";

import dynamic from "next/dynamic";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      className="flex h-[100dvh] min-h-96 items-center justify-center bg-[#e7efe9] text-[#0f2742]"
    >
      Loading the Metro Cebu map…
    </div>
  ),
});

export default function MapCanvasLoader() {
  return <MapCanvas />;
}
