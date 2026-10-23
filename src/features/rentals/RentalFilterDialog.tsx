"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DEFAULT_RENTAL_FILTERS, type PropertyType, type RentalFilters } from "@/contracts/rental-filters";

type Props = { filters: RentalFilters; open?: boolean; onOpenChange?: (open: boolean) => void; onApply: (filters: RentalFilters) => void; matchCount: number };
const types: { id: PropertyType; label: string }[] = [
  { id: "private_room", label: "Private room" },
  { id: "bedspace", label: "Bedspace" },
  { id: "boarding_house", label: "Boarding house" },
  { id: "shared_room", label: "Shared room" },
  { id: "studio", label: "Studio" },
  { id: "apartment", label: "Apartment" },
  { id: "condo", label: "Condo" },
  { id: "house", label: "House" },
];

export function RentalFilterDialog({ filters, open: controlledOpen, onOpenChange, onApply, matchCount }: Props) {
  const [localOpen, setLocalOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const open = controlledOpen ?? localOpen;
  const setOpen = (next: boolean) => { setLocalOpen(next); onOpenChange?.(next); };
  const updateBoolean = (field: keyof RentalFilters, checked: boolean) => setDraft((current) => ({ ...current, [field]: checked ? true : null }));

  return <>
    {onOpenChange === undefined && <Button type="button" variant="outline" onClick={() => { setDraft(filters); setOpen(true); }} aria-haspopup="dialog" aria-expanded={open}>
      <SlidersHorizontal size={16} aria-hidden="true" /> Refine rental search
    </Button>}
    <Modal surface="finder" open={open} onClose={() => setOpen(false)} title="Refine rental search" description="Filter verified records returned by the configured rental data service." className="max-h-[85dvh] max-w-xl overflow-y-auto">
      <form onSubmit={(event) => { event.preventDefault(); onApply(draft); setOpen(false); }} className="grid gap-4">
        <fieldset className="grid gap-2 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-semibold">Property type</legend>
          {types.map(({ id, label }) => <label key={id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.propertyTypes.includes(id)} onChange={(event) => setDraft((current) => ({ ...current, propertyTypes: event.target.checked ? [...current.propertyTypes, id] : current.propertyTypes.filter((type) => type !== id) }))} />{label}</label>)}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm" htmlFor="rental-min-price">Minimum monthly budget (₱)<input className="min-h-11 rounded-md border border-input bg-background px-3" id="rental-min-price" type="number" min="0" max="50000" step="500" value={draft.minPrice ?? ""} onChange={(event) => setDraft((current) => ({ ...current, minPrice: event.target.value === "" ? null : Number(event.target.value) }))} /></label>
          <label className="grid gap-1 text-sm" htmlFor="rental-max-price">Maximum monthly budget (₱)<input className="min-h-11 rounded-md border border-input bg-background px-3" id="rental-max-price" type="number" min="0" max="50000" step="500" value={draft.maxPrice ?? ""} onChange={(event) => setDraft((current) => ({ ...current, maxPrice: event.target.value === "" ? null : Number(event.target.value) }))} /></label>
          <label className="grid gap-1 text-sm" htmlFor="rental-occupants">People staying<input className="min-h-11 rounded-md border border-input bg-background px-3" id="rental-occupants" type="number" min="1" max="20" value={draft.occupants ?? ""} onChange={(event) => setDraft((current) => ({ ...current, occupants: event.target.value === "" ? null : Number(event.target.value) }))} /></label>
          <label className="grid gap-1 text-sm" htmlFor="rental-bathroom">Bathroom<select className="min-h-11 rounded-md border border-input bg-background px-3" id="rental-bathroom" value={draft.bathroom ?? ""} onChange={(event) => setDraft((current) => ({ ...current, bathroom: event.target.value === "" ? null : event.target.value as RentalFilters["bathroom"] }))}><option value="">Any bathroom</option><option value="private">Private</option><option value="shared">Shared</option></select></label>
        </div>
        <fieldset className="grid gap-1 rounded-lg border border-border p-3 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold">Essentials</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.wifiAvailable === true} onChange={(event) => updateBoolean("wifiAvailable", event.target.checked)} />Wi-Fi</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.cookingAllowed === true} onChange={(event) => updateBoolean("cookingAllowed", event.target.checked)} />Cooking allowed</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.laundryAllowed === true} onChange={(event) => updateBoolean("laundryAllowed", event.target.checked)} />Laundry allowed</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.aircon === true} onChange={(event) => updateBoolean("aircon", event.target.checked)} />Air conditioning</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.motorcycleParking === true} onChange={(event) => updateBoolean("motorcycleParking", event.target.checked)} />Motorcycle parking</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.carParking === true} onChange={(event) => updateBoolean("carParking", event.target.checked)} />Car parking</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.waterIncluded === true} onChange={(event) => updateBoolean("waterIncluded", event.target.checked)} />Water included</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.electricityIncluded === true} onChange={(event) => updateBoolean("electricityIncluded", event.target.checked)} />Electricity included</label>
        </fieldset>
        <label className="grid gap-1 text-sm" htmlFor="rental-curfew">Curfew<select className="min-h-11 rounded-md border border-input bg-background px-3" id="rental-curfew" value={draft.curfewType ?? ""} onChange={(event) => setDraft((current) => ({ ...current, curfewType: event.target.value === "" ? null : event.target.value as RentalFilters["curfewType"] }))}><option value="">Any curfew policy</option><option value="none">No curfew</option><option value="fixed">Fixed curfew</option><option value="conditional">Conditional curfew</option></select></label>
        <fieldset className="grid gap-1 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-semibold">Trust</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.verifiedOnly === true} onChange={(event) => updateBoolean("verifiedOnly", event.target.checked)} />Verified listings</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.directLandlordOnly === true} onChange={(event) => updateBoolean("directLandlordOnly", event.target.checked)} />Direct landlord</label>
        </fieldset>
        <footer className="flex flex-wrap justify-between gap-3 border-t border-border pt-3">
          <Button type="button" variant="ghost" onClick={() => setDraft(DEFAULT_RENTAL_FILTERS)}>Reset</Button>
          <Button type="submit">Show {matchCount} {matchCount === 1 ? "rental" : "rentals"}</Button>
        </footer>
      </form>
    </Modal>
  </>;
}
