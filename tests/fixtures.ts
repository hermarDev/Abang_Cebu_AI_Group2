import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const providerAttribution = JSON.parse(readFileSync("public/styles/osm.json", "utf8")).sources.openmaptiles.attribution as string;

// Extend Window type for Turnstile mock
declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, config: { sitekey: string; action: string; callback: (token: string) => void }) => number;
      reset: (widgetId: number) => void;
      remove: (widgetId: number) => void;
      ready: (callback: () => void) => void;
      _cb: ((token: string) => void) | null;
    };
    loadTurnstile?: () => Promise<{
      render: (container: HTMLElement, config: { sitekey: string; action: string; callback: (token: string) => void }) => number;
      reset: (widgetId: number) => void;
      remove: (widgetId: number) => void;
      ready: (callback: () => void) => void;
      _cb: ((token: string) => void) | null;
    }>;
  }
}

export const test = base.extend<{ blockedRequests: string[] }>({
  blockedRequests: async ({}, provide) => { await provide([]); },
  context: async ({ context, baseURL, blockedRequests }, provide) => {
    const origin = new URL(baseURL!).origin;
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== origin || (!["GET", "HEAD"].includes(request.method()) && !url.pathname.startsWith("/auth/v1/"))) {
        blockedRequests.push(`${request.method()} ${url.href}`);
        return route.abort("blockedbyclient");
      }
      if (url.pathname === "/api/places") {
        return route.fulfill({ json: { places: [] } });
      }
      if (url.pathname === "/api/rentals") {
        return route.fulfill({ json: { rentals: [] } });
      }
      if (url.pathname === "/styles/osm.json" || url.pathname === "/styles/osm-dark.json") {
        // shortcut: fixture tests controls, not provider tiles; verify geography separately.
        return route.fulfill({ json: {
          version: 8,
          sources: { fixture: { type: "geojson", data: { type: "FeatureCollection", features: [] }, attribution: providerAttribution } },
          layers: [{ id: "background", type: "background", paint: { "background-color": url.pathname.includes("osm-dark") ? "#0c0c0c" : "#e5edf0" } }, { id: "fixture", type: "circle", source: "fixture" }],
        } });
      }
      return route.continue();
    });
    // Mock Turnstile script
    await context.addInitScript(() => {
      const turnstile = {
        render: (container: HTMLElement, config: { sitekey: string; action: string; callback: (token: string) => void }) => {
          container.innerHTML = '<button type="button" data-testid="turnstile-widget" data-action="' + (config.action || 'signup') + '">Complete security verification</button>';
          const btn = container.querySelector('[data-testid="turnstile-widget"]');
          if (btn) {
            btn.addEventListener('click', () => {
              if (turnstile._cb) turnstile._cb('mock-token');
            });
          }
          turnstile._cb = config.callback;
          return 1; // widgetId
        },
        reset: () => {},
        remove: () => {},
        ready: (callback: () => void) => callback(),
        _cb: null as ((token: string) => void) | null,
      };
      window.turnstile = turnstile;
      // Override the loadTurnstile function used by the component
      window.loadTurnstile = () => Promise.resolve(turnstile);
    });
    await provide(context);
  },
});

export { expect };