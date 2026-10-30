"use client";

import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    size: "flexible";
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": (errorCode: number) => void;
    "timeout-callback": () => void;
    "response-field": false;
  }) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

let scriptReady: Promise<Turnstile> | undefined;
function loadTurnstile() {
  const current = (window as Window & { turnstile?: Turnstile }).turnstile;
  if (current) return Promise.resolve(current);
  // Keep one script across SPA navigation and concurrent widget mounts.
  return scriptReady ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timeout = setTimeout(() => finish(), 15000);
    function finish() {
      clearTimeout(timeout);
      script.removeEventListener("load", loaded);
      script.removeEventListener("error", failed);
      const api = (window as Window & { turnstile?: Turnstile }).turnstile;
      if (api) resolve(api);
      else reject(new Error("Security verification unavailable"));
    }
    const loaded = () => finish();
    const failed = () => finish();
    script.addEventListener("load", loaded);
    script.addEventListener("error", failed);
    document.head.appendChild(script);
  });
}

export function TurnstileWidget({ onTokenChange, resetKey = 0 }: {
  onTokenChange: (token: string) => void;
  resetKey?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onTokenChange);
  useEffect(() => { callback.current = onTokenChange; }, [onTokenChange]);
  const widget = useRef<{ api: Turnstile; id: string } | null>(null);
  const [status, setStatus] = useState("Loading security verification…");
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    let active = true;
    callback.current("");
    if (!sitekey) return;
    loadTurnstile().then((api) => {
      if (!active || !container.current) return;
      const clear = (message: string) => {
        if (!active) return;
        callback.current("");
        setStatus(message);
      };
      const id = api.render(container.current, {
        sitekey, size: "flexible", "response-field": false,
        "expired-callback": () => clear("Verification expired. Complete the security verification again."),
        "error-callback": (errorCode) => {
          const errorFamily = Math.floor(errorCode / 1000);
          if (process.env.NODE_ENV === "development" && errorCode === 110200) {
            clear("This Turnstile key does not allow localhost. Add localhost to this widget’s Hostname Management in Cloudflare.");
            return;
          }
          if (process.env.NODE_ENV === "development" && (errorFamily === 300 || errorFamily === 600)) {
            clear(`Cloudflare rejected this browser session (error ${errorCode}). Try a clean browser session or a real mobile device; DevTools emulation can trigger this challenge failure.`);
            return;
          }
          if (process.env.NODE_ENV === "development") {
            clear(`Cloudflare verification failed (error ${errorCode}). Check the widget key, network access to challenges.cloudflare.com, and allowed hostnames.`);
            return;
          }
          clear("Security verification failed. Please try again or reload.");
        },
        "timeout-callback": () => clear("Verification expired. Complete the security verification again."),
        callback: (token) => {
          if (!active) return;
          callback.current(token);
          setStatus("Verification complete.");
        },
      });
      widget.current = { api, id };
      setStatus("Complete the security verification.");
    }).catch(() => {
      if (active) setStatus("Security verification unavailable. Please reload and try again.");
    });
    return () => {
      active = false;
      const mounted = widget.current;
      widget.current = null;
      if (mounted) mounted.api.remove(mounted.id);
      callback.current("");
    };
  }, [sitekey]);

  useEffect(() => {
    const mounted = widget.current;
    if (mounted) {
      callback.current("");
      mounted.api.reset(mounted.id);
      setStatus("Complete the security verification.");
    }
  }, [resetKey]);

  const message = sitekey ? status : "Security verification unavailable. Please reload and try again.";
  return (
    <div className="min-w-0 space-y-2">
      <div ref={container} aria-label="Security verification" />
      <p role={/unavailable|failed/.test(message) ? "alert" : "status"} aria-live="polite" className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
