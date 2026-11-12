"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileAction = "signup" | "login" | "recovery";

type Turnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    size: "flexible";
    action: TurnstileAction;
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
  // Check for pre-loaded turnstile (e.g., from test fixtures)
  const current = (window as Window & { turnstile?: Turnstile }).turnstile;
  if (current) return Promise.resolve(current);
  return scriptReady ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timeout = setTimeout(() => finish(), 15_000);
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

export function TurnstileWidget({ onTokenChange, action, resetKey = 0 }: {
  onTokenChange: (token: string) => void;
  action: TurnstileAction;
  resetKey?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onTokenChange);
  const widget = useRef<{ api: Turnstile; id: string } | null>(null);
  const [status, setStatus] = useState("Loading security verification…");
  // Next.js replaces process.env.NEXT_PUBLIC_* at build time
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => { callback.current = onTokenChange; }, [onTokenChange]);

  useEffect(() => {
    let active = true;
    callback.current("");
    if (!sitekey) {
      setTimeout(() => {
        if (active) setStatus("Security verification unavailable. Please reload and try again.");
      });
      return;
    }
    loadTurnstile().then((api) => {
      if (!active || !container.current) return;
      const clear = (message: string) => {
        if (!active) return;
        callback.current("");
        setStatus(message);
      };
      const id = api.render(container.current, {
        sitekey,
        size: "flexible",
        action,
        "response-field": false,
        "expired-callback": () => clear("Verification expired. Complete the security verification again."),
        "error-callback": (errorCode) => {
          if (process.env.NODE_ENV === "development" && errorCode === 110200) {
            clear("This Turnstile key does not allow localhost. Add localhost to this widget’s Hostname Management in Cloudflare.");
            return;
          }
          if (process.env.NODE_ENV === "development" && (Math.floor(errorCode / 1000) === 300 || Math.floor(errorCode / 1000) === 600)) {
            clear(`Cloudflare rejected this browser session (error ${errorCode}). Try a clean browser session or a real mobile device.`);
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
  }, [sitekey, action]);

  useEffect(() => {
    const mounted = widget.current;
    if (mounted) {
      callback.current("");
      mounted.api.reset(mounted.id);
      setStatus("Complete the security verification.");
    }
  }, [resetKey]);

  const unavailable = /unavailable|failed/i.test(status);
  return (
    <div className="min-w-0 space-y-2">
      <div ref={container} aria-label="Security verification" />
      <p role={unavailable ? "alert" : "status"} aria-live="polite" className="text-sm text-muted-foreground">{status}</p>
    </div>
  );
}
