"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { type MapContainerProps } from "./types";

/**
 * Dynamic MapLibre component with Server-Side Rendering (SSR) disabled.
 * This guarantees that MapLibre's WebGL and window dependencies are only evaluated in the browser.
 */
export const MapLibreView = dynamic<MapContainerProps>(
  () => import("./map-container").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[500px] w-full flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <Skeleton className="h-10 w-10 rounded-full mb-3" />
        <p className="text-sm font-medium text-zinc-500">Loading AbangCebu Map...</p>
      </div>
    ),
  }
);

export * from "./types";
