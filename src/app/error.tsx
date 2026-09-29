"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error captured in boundary:", error);
  }, [error]);

  return (
    <div className="container mx-auto flex h-[60vh] max-w-md flex-col items-center justify-center text-center px-4">
      <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-950 dark:text-red-400 mb-4">
        ⚠️
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Something went wrong!
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        An error occurred while loading this page or spatial data.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => reset()}>Try Again</Button>
      </div>
    </div>
  );
}
