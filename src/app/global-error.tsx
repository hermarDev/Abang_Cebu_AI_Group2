"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased font-sans">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertCircle size={28} aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Application Error
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              A critical error occurred. Please try reloading the application.
            </p>
            {error.digest && (
              <p className="font-mono text-xs text-slate-500 pt-1">
                Error reference: {error.digest}
              </p>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <RotateCcw size={18} aria-hidden="true" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
