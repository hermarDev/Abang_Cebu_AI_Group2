"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DEFAULT_RENTAL_FILTERS, type PropertyType, type RentalFilters } from "@/contracts/rental-filters";
import styles from "./RentalFilterDialog.module.css";

type Props = { filters: RentalFilters; open?: boolean; onOpenChange?: (open: boolean) => void; onApply: (filters: RentalFilters) => void; matchCount: number; mapRadius?: number; onMapRadiusChange?: (radius: number) => void; getDraftCount?: (draft: RentalFilters, radius: number) => number | null };
export type DraftState = { filters: RentalFilters; open: boolean; draft: RentalFilters; radius: number };
const DEFAULT_RADIUS = 2;
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

function copyFilters(filters: RentalFilters): RentalFilters {
  return { ...filters, propertyTypes: [...filters.propertyTypes], furnishingTypes: [...filters.furnishingTypes] };
}

export function getBudgetError(filters: RentalFilters): string {
  const { minPrice, maxPrice } = filters;
  if ([minPrice, maxPrice].some((value) => value != null && (!Number.isFinite(value) || value < 0 || value > 50_000))) {
    return "Enter a monthly budget between ₱0 and ₱50,000.";
  }
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    return "Minimum budget must not exceed maximum budget.";
  }
  return "";
}

export function countDraftRentals(draft: RentalFilters, radius: number, count?: Props["getDraftCount"]): number | null {
  if (getBudgetError(draft)) return null;
  return count?.(draft, radius) ?? null;
}

export function createDraftState(filters: RentalFilters, radius = DEFAULT_RADIUS, open = true): DraftState {
  return { filters, open, draft: copyFilters(filters), radius };
}

export function syncDraftState(state: DraftState, filters: RentalFilters, open: boolean, radius = DEFAULT_RADIUS): DraftState {
  return state.filters !== filters || state.open !== open
    ? { filters, open, draft: open ? copyFilters(filters) : state.draft, radius: open ? radius : state.radius }
    : state;
}

export function setDraftRadius(state: DraftState, radius: number): DraftState {
  return { ...state, radius };
}

export function resetDraft(state: DraftState): DraftState {
  return { ...state, draft: copyFilters(DEFAULT_RENTAL_FILTERS), radius: DEFAULT_RADIUS };
}

export function applyDraft(state: DraftState, onApply: (filters: RentalFilters) => void, onRadiusChange?: (radius: number) => void) {
  onApply(state.draft);
  onRadiusChange?.(state.radius);
}

export function RentalFilterDialog({ filters, open: controlledOpen, onOpenChange, onApply, mapRadius, onMapRadiusChange, getDraftCount: getDraftCountCallback }: Props) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const [state, setState] = useState<DraftState>(() => createDraftState(filters, mapRadius ?? DEFAULT_RADIUS, open));
  if (state.filters !== filters || state.open !== open) {
    setState(syncDraftState(state, filters, open, mapRadius ?? DEFAULT_RADIUS));
  }
  const draft = state.draft;
  const updateDraft = (update: (current: RentalFilters) => RentalFilters) => setState((current) => ({ ...current, draft: update(current.draft) }));
  const setRadiusDraft = (radius: number) => setState((current) => setDraftRadius(current, radius));
  const setOpen = (next: boolean) => { setLocalOpen(next); onOpenChange?.(next); };
  const updateBoolean = (field: keyof RentalFilters, checked: boolean) => updateDraft((current) => ({ ...current, [field]: checked ? true : null }));
  const budgetError = getBudgetError(draft);
  const draftCount = countDraftRentals(draft, state.radius, getDraftCountCallback);

  return <>
    {onOpenChange === undefined && <Button type="button" variant="outline" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      <SlidersHorizontal size={16} aria-hidden="true" /> Refine rental search
    </Button>}
    <Modal surface="finder" open={open} onClose={() => setOpen(false)} title="Filters" description="Choose what matters for your next place." data-filter-surface="responsive-sheet" className={styles.dialog}>
      <form onSubmit={(event) => { event.preventDefault(); if (budgetError) return; applyDraft(state, onApply, onMapRadiusChange); setOpen(false); }} className={styles.form} noValidate>
        <div className={styles.options} data-scroll-region="filter-options">
          <section className={styles.filterGroup} aria-labelledby="rental-area-heading">
            <h3 id="rental-area-heading">Search area</h3>
            <label htmlFor="rental-radius">Search radius<select id="rental-radius" value={state.radius} onChange={(event) => setRadiusDraft(Number(event.target.value))}><option value={1}>1 km</option><option value={2}>2 km</option><option value={5}>5 km</option></select></label>
          </section>
          <section className={styles.filterGroup} aria-labelledby="rental-budget-heading">
            <h3 id="rental-budget-heading">Monthly budget</h3>
            <div className={styles.budgetGrid}>
              <label htmlFor="rental-min-price">Minimum monthly budget (₱)<input id="rental-min-price" type="number" min="0" max="50000" step="500" value={draft.minPrice ?? ""} aria-invalid={Boolean(budgetError)} aria-describedby={budgetError ? "rental-budget-error" : undefined} onChange={(event) => updateDraft((current) => ({ ...current, minPrice: event.target.value === "" ? null : Number(event.target.value) }))} /></label>
              <label htmlFor="rental-max-price">Maximum monthly budget (₱)<input id="rental-max-price" type="number" min="0" max="50000" step="500" value={draft.maxPrice ?? ""} aria-invalid={Boolean(budgetError)} aria-describedby={budgetError ? "rental-budget-error" : undefined} onChange={(event) => updateDraft((current) => ({ ...current, maxPrice: event.target.value === "" ? null : Number(event.target.value) }))} /></label>
              {budgetError && <p id="rental-budget-error" className="text-sm text-destructive sm:col-span-2" role="alert">{budgetError}</p>}
            </div>
          </section>
          <details className={styles.filterGroup}>
            <summary>Property type{draft.propertyTypes.length > 0 ? ` (${draft.propertyTypes.length} selected)` : ""}</summary>
            <fieldset className={styles.optionGrid}>
              <legend className="sr-only">Property type</legend>
              {types.map(({ id, label }) => <label key={id}><input type="checkbox" checked={draft.propertyTypes.includes(id)} onChange={(event) => updateDraft((current) => ({ ...current, propertyTypes: event.target.checked ? [...current.propertyTypes, id] : current.propertyTypes.filter((type) => type !== id) }))} />{label}</label>)}
            </fieldset>
          </details>
          <details className={styles.filterGroup}>
            <summary>Essentials</summary>
            <div className={styles.essentialFields}>
              <label htmlFor="rental-occupants">People staying<input id="rental-occupants" type="number" min="1" max="20" value={draft.occupants ?? ""} onChange={(event) => updateDraft((current) => ({ ...current, occupants: event.target.value === "" ? null : Number(event.target.value) }))} /></label>
              <label htmlFor="rental-bathroom">Bathroom<select id="rental-bathroom" value={draft.bathroom ?? ""} onChange={(event) => updateDraft((current) => ({ ...current, bathroom: event.target.value === "" ? null : event.target.value as RentalFilters["bathroom"] }))}><option value="">Any bathroom</option><option value="private">Private</option><option value="shared">Shared</option></select></label>
              <fieldset className={styles.optionGrid}>
                <legend className="sr-only">Essentials</legend>
                <label><input type="checkbox" checked={draft.wifiAvailable === true} onChange={(event) => updateBoolean("wifiAvailable", event.target.checked)} />Wi-Fi</label>
                <label><input type="checkbox" checked={draft.cookingAllowed === true} onChange={(event) => updateBoolean("cookingAllowed", event.target.checked)} />Cooking allowed</label>
                <label><input type="checkbox" checked={draft.laundryAllowed === true} onChange={(event) => updateBoolean("laundryAllowed", event.target.checked)} />Laundry allowed</label>
                <label><input type="checkbox" checked={draft.aircon === true} onChange={(event) => updateBoolean("aircon", event.target.checked)} />Air conditioning</label>
                <label><input type="checkbox" checked={draft.motorcycleParking === true} onChange={(event) => updateBoolean("motorcycleParking", event.target.checked)} />Motorcycle parking</label>
                <label><input type="checkbox" checked={draft.carParking === true} onChange={(event) => updateBoolean("carParking", event.target.checked)} />Car parking</label>
                <label><input type="checkbox" checked={draft.waterIncluded === true} onChange={(event) => updateBoolean("waterIncluded", event.target.checked)} />Water included</label>
                <label><input type="checkbox" checked={draft.electricityIncluded === true} onChange={(event) => updateBoolean("electricityIncluded", event.target.checked)} />Electricity included</label>
              </fieldset>
            </div>
          </details>
          <details className={styles.filterGroup}>
            <summary>Policies</summary>
            <div className={styles.essentialFields}>
              <label htmlFor="rental-curfew">Curfew<select id="rental-curfew" value={draft.curfewType ?? ""} onChange={(event) => updateDraft((current) => ({ ...current, curfewType: event.target.value === "" ? null : event.target.value as RentalFilters["curfewType"] }))}><option value="">Any curfew policy</option><option value="none">No curfew</option><option value="fixed">Fixed curfew</option><option value="conditional">Conditional curfew</option></select></label>
              <fieldset className={styles.optionGrid}>
                <legend>Trust</legend>
                <label><input type="checkbox" checked={draft.verifiedOnly === true} onChange={(event) => updateBoolean("verifiedOnly", event.target.checked)} />Verified listings</label>
                <label><input type="checkbox" checked={draft.directLandlordOnly === true} onChange={(event) => updateBoolean("directLandlordOnly", event.target.checked)} />Direct landlord</label>
              </fieldset>
            </div>
          </details>
        </div>
        <footer data-sticky-footer="true" className={styles.footer}>
          <Button type="button" variant="ghost" onClick={() => setState(resetDraft)}>Reset</Button>
          <Button type="submit" disabled={Boolean(budgetError)}>{draftCount == null ? "Apply filters" : `Show ${draftCount} rentals`}</Button>
        </footer>
      </form>
    </Modal>
  </>;
}
