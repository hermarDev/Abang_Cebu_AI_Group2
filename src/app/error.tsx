"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Home, RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary caught:", error);
  }, [error]);

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-background via-background to-muted/40 text-foreground">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <Link href="/" aria-label="AbangCebu Home">
            <Image
              src="/icons/main_Logo.png"
              alt="AbangCebu"
              width={299}
              height={100}
              unoptimized
              className="h-10 w-auto dark:hidden"
              priority
            />
            <Image
              src="/icons/main_Logo_Light.png"
              alt="AbangCebu"
              width={299}
              height={100}
              unoptimized
              className="hidden h-10 w-auto dark:block"
              priority
            />
          </Link>
        </div>

        <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle size={28} aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
            An unexpected error occurred while loading this view. You can try reloading or return home.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground/80 pt-1">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-action-foreground shadow-sm hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer transition-colors"
          >
            <RotateCcw size={18} aria-hidden="true" />
            <span>Try again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors"
          >
            <Home size={18} aria-hidden="true" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
