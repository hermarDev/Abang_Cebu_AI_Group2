"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { formatPrice } from "@/features/rentals/search";
import { ArrowLeft, Bookmark, Building2, MapPin, MessageSquare, Trash2 } from "lucide-react";
import { notify } from "@/components/ui/AppToaster";
import { Skeleton } from "@/components/ui/Skeleton";
import { PropertyDetailsSheet } from "@/features/rentals/PropertyDetailsSheet";
import type { RentalResult } from "@/contracts/preview";

type SavedRental = {
  id: string;
  savedAt: string;
  title: string;
  description: string;
  price: number;
  propertyType: string;
  address: string;
  city: string;
  imageUrls: string[];
  isAvailable: boolean;
};

function propertyTypeLabel(value: string) {
  const labels: Record<string, string> = {
    bedspace: "Bedspace",
    boarding_house: "Boarding house",
    private_room: "Private room",
    shared_room: "Shared room",
    studio: "Studio",
    apartment: "Apartment",
    condo: "Condo",
    house: "House",
  };
  return labels[value] ?? value.replaceAll(/[-_]/g, " ");
}

export function SavedRentalsContent({ userId }: { userId: string | null }) {
  if (!userId) return <p role="alert">Sign in to view saved rentals.</p>;
  return <SavedRentalsSession key={userId} userId={userId} />;
}

function SavedRentalsSession({ userId }: { userId: string }) {
  const [rentals, setRentals] = useState<SavedRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [selectedRental, setSelectedRental] = useState<SavedRental | null>(null);
  const retryController = useRef<AbortController | null>(null);

  const fetchRentals = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/favorites", { cache: "no-store", signal, headers: { "x-expected-user-id": userId } });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || !payload || typeof payload !== "object" || !("favorites" in payload) || !Array.isArray(payload.favorites)) {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "Saved rentals could not be loaded. Please try again.";
        throw new Error(message);
      }
      if (signal?.aborted) return;
      setRentals(payload.favorites as SavedRental[]);
      setError(null);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Saved rentals could not be loaded. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch triggers async state update with abort handling
    void fetchRentals(controller.signal);
    return () => {
      controller.abort();
      retryController.current?.abort();
    };
  }, [fetchRentals]);

  function retryLoad() {
    retryController.current?.abort();
    const controller = new AbortController();
    retryController.current = controller;
    setLoading(true);
    setError(null);
    void fetchRentals(controller.signal).finally(() => {
      if (retryController.current === controller) retryController.current = null;
    });
  }

  async function restoreRental(rental: SavedRental) {
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-expected-user-id": userId },
        body: JSON.stringify({ listingId: rental.id }),
      });
      if (!response.ok) throw new Error("restore failed");
      setRentals((current) => current.some((item) => item.id === rental.id) ? current : [rental, ...current]);
      notify("success", "saved-rental-restored", "Rental restored to your saved list.");
    } catch {
      notify("error", "saved-rental-restore-failed", "Rental could not be restored. Please try again.");
    }
  }

  async function removeRental(id: string): Promise<boolean> {
    if (removingId) return false;
    const removedRental = rentals.find((rental) => rental.id === id);
    setRemovingId(id);
    setRemoveError(null);
    try {
      const response = await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-expected-user-id": userId },
        body: JSON.stringify({ listingId: id }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "This rental could not be removed. Please try again.";
        throw new Error(message);
      }
      setRentals((current) => current.filter((rental) => rental.id !== id));
      notify("success", `saved-rental-removed-${id}`, "Rental removed from your saved list.", removedRental ? { action: { label: "Undo", onClick: () => { void restoreRental(removedRental); } } } : undefined);
      return true;
    } catch (removeError) {
      setRemoveError(removeError instanceof Error ? removeError.message : "This rental could not be removed. Please try again.");
      return false;
    } finally {
      setRemovingId(null);
    }
  }

    return <main className="relative isolate min-h-[100dvh] overflow-hidden bg-background text-foreground">
    <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="sticky top-3 z-20 flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-white/90 p-3 shadow-sm backdrop-blur-sm dark:bg-slate-950/90 sm:px-5">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <ArrowLeft size={18} aria-hidden="true" /> Back to map
          </Link>
          <BrandLogo className="h-auto w-28 sm:w-32" />
        </header>

        <section className="relative z-10 mx-auto mt-5 w-full max-w-5xl">
          <div className="rounded-2xl border border-border/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:bg-slate-950/90 sm:p-6">
            <p className="m-0 text-xs font-bold uppercase tracking-[.14em] text-action">Your rentals</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">Saved rentals</h1>
                <p className="mb-0 mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Keep the places you’re considering together in one list.</p>
              </div>
              {!loading && !error && <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">{rentals.length} {rentals.length === 1 ? "rental" : "rentals"}</span>}
            </div>
          </div>

          {removeError && <p className="mt-4 rounded-xl border border-destructive/30 bg-card/95 p-4 text-sm text-destructive shadow-sm" role="alert">{removeError}</p>}
          {error && <div className="mt-4 rounded-xl border border-destructive/30 bg-card/95 p-4 text-sm text-destructive shadow-sm" role="alert">
            <p className="m-0">{error}</p>
            <button type="button" className="mt-3 min-h-10 rounded-lg border border-border px-3 font-semibold text-foreground hover:bg-muted" onClick={retryLoad}>Try again</button>
          </div>}

          {loading ? <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading saved rentals">
              <span className="sr-only">Loading your saved rentals…</span>
              {[0, 1, 2].map((index) => <div key={index} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="grid gap-2 p-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-full" /></div>
              </div>)}
            </div>
            : !error && rentals.length === 0 ? <div className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-border/70 bg-card/95 p-6 text-center shadow-sm">
              <div className="max-w-sm">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-action/10 text-action"><Bookmark size={22} aria-hidden="true" /></span>
                <h2 className="mb-0 mt-4 text-xl font-semibold">No saved rentals yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">Browse the map and bookmark rentals you’d like to compare later.</p>
                <Link href="/" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action-hover">Browse rentals</Link>
              </div>
            </div> : !error && <ul className="mt-5 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
              {rentals.map((rental) => <li key={rental.id}>
                <article className="h-full overflow-hidden rounded-2xl border border-border/70 bg-card/95 text-card-foreground shadow-sm backdrop-blur-sm">
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {rental.imageUrls[0]
                      ? <Image src={rental.imageUrls[0]} alt={"Photo of " + rental.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" unoptimized className="object-cover" />
                      : <div className="grid h-full place-items-center text-muted-foreground"><Building2 size={32} aria-hidden="true" /><span className="text-sm">No photos provided</span></div>}
                    <span className={"absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm " + (rental.isAvailable ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200")}>
                      {rental.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <div className="grid gap-2 p-4">
                    {rental.isAvailable && rental.propertyType && <p className="m-0 text-xs font-bold uppercase tracking-wide text-action">{propertyTypeLabel(rental.propertyType)}</p>}
                    <h2 className="m-0 line-clamp-2 break-words text-lg font-semibold leading-snug">{rental.title}</h2>
                    {rental.isAvailable && <p className="m-0 text-xl font-bold text-action">{formatPrice(rental.price)}<span className="text-sm font-medium text-muted-foreground"> / month</span></p>}
                    {rental.isAvailable && (rental.address || rental.city) && <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="line-clamp-2 break-words">{rental.address || rental.city}</span></p>}
                    {rental.description && <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{rental.description}</p>}
                    <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex min-h-10 items-center text-sm font-semibold text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
                          onClick={() => setSelectedRental(rental)}
                        >
                          View details
                        </button>
                        {rental.isAvailable && (
                          <Link href={`/?selected=${encodeURIComponent(rental.id)}`} className="inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">View on map</Link>
                        )}
                      </div>
                      {!rental.isAvailable && <span className="text-sm font-semibold text-muted-foreground">No longer available</span>}
                      <button type="button" disabled={removingId === rental.id} aria-label={"Remove " + rental.title + " from saved rentals"} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted disabled:cursor-wait disabled:opacity-60" onClick={() => { void removeRental(rental.id); }}>
                        <Trash2 size={16} aria-hidden="true" />{removingId === rental.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
                    {rental.isAvailable && <button type="button" aria-label={"Message landlord about " + rental.title} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-action px-3 text-sm font-semibold text-action-foreground hover:bg-action-hover" onClick={() => { if (typeof window !== "undefined") window.location.href = `/messages?listing=${encodeURIComponent(rental.id)}`; }}>
                      <MessageSquare size={16} aria-hidden="true" />Message landlord
                    </button>}
                  </div>
                </article>
              </li>)}
            </ul>}
        </section>
      </div>
    </div>
    {selectedRental && (
      <PropertyDetailsSheet
        open={Boolean(selectedRental)}
        onClose={() => setSelectedRental(null)}
        rental={{
          id: selectedRental.id,
          title: selectedRental.title,
          locality: selectedRental.city,
          address: selectedRental.address ?? undefined,
          coordinates: [123.89, 10.32],
          price: selectedRental.price,
          type: (selectedRental.propertyType as RentalResult["type"]) ?? "room",
          propertyType: (selectedRental.propertyType as RentalResult["propertyType"]) ?? undefined,
          basis: "room",
          amenities: [],
          description: selectedRental.description,
          area: 0,
          tone: "blue",
          available: selectedRental.isAvailable,
          distanceMeters: null,
          imageUrls: selectedRental.imageUrls,
        }}
        canMessage={selectedRental.isAvailable}
        onMessage={(id) => {
          setSelectedRental(null);
          if (typeof window !== "undefined") window.location.href = `/messages?listing=${encodeURIComponent(id)}`;
        }}
        canSave={true}
        saved={true}
        onToggleSaved={async (id) => {
          const removed = await removeRental(id);
          if (removed) setSelectedRental(null);
        }}
      />
    )}
  </main>;
}
