"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parsePlacesResponse, type PlaceResult } from "@/lib/search/places";

type LookupState = {
  status: "idle" | "loading" | "ready" | "error";
  places: PlaceResult[];
  error?: string;
};

const UNAVAILABLE_MESSAGE = "Place search is unavailable. Retry or choose a preset area.";

export function usePlaceLookup() {
  const [lookup, setLookup] = useState<LookupState>({ status: "idle", places: [] });
  const active = useRef<AbortController | null>(null);

  useEffect(() => () => active.current?.abort(), []);

  const reset = useCallback(() => {
    active.current?.abort();
    active.current = null;
    setLookup({ status: "idle", places: [] });
  }, []);

  const search = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    active.current?.abort();
    if (query.length < 3 || query.length > 120) {
      setLookup({ status: "idle", places: [] });
      return;
    }

    const controller = new AbortController();
    active.current = controller;
    setLookup({ status: "loading", places: [] });
    try {
      const response = await fetch(`/api/places?${new URLSearchParams({ q: query })}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(UNAVAILABLE_MESSAGE);
      const places = parsePlacesResponse(await response.json());
      if (!places) throw new Error(UNAVAILABLE_MESSAGE);
      if (active.current === controller) setLookup({ status: "ready", places });
    } catch {
      if (active.current === controller && !controller.signal.aborted) {
        setLookup({ status: "error", places: [], error: UNAVAILABLE_MESSAGE });
      }
    }
  }, []);

  return { ...lookup, search, reset };
}
