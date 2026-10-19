"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  AMENITIES,
  GENDER_POLICIES,
  PROPERTY_TYPES,
  isRentRangeValid,
  toggleFilterValue,
  type Amenity,
  type GenderPolicy,
  type PropertyType,
  type SearchFilters,
} from "@/lib/search-filters";
import styles from "./SearchFilterPanel.module.css";

const TYPE_LABELS: Record<PropertyType, string> = {
  boarding_house: "Boarding house",
  bedspace: "Bedspace",
  apartment: "Apartment",
  condo: "Condo",
};

const AMENITY_LABELS: Record<Amenity, string> = {
  aircon: "Air conditioning",
  wifi: "Wi-Fi",
  private_cr: "Private CR",
  cooking_allowed: "Cooking allowed",
  laundry: "Laundry",
  submeter: "Electricity submeter",
};

const GENDER_LABELS: Record<GenderPolicy, string> = {
  male_only: "Male only",
  female_only: "Female only",
  coed: "Any gender",
};

interface SearchFilterPanelProps {
  filters: SearchFilters;
  activeFilterCount: number;
  onChange: (filters: SearchFilters) => void;
  onClear: () => void;
}

export default function SearchFilterPanel({
  filters,
  activeFilterCount,
  onChange,
  onClear,
}: SearchFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SearchFilters>(() => filters);
  const [snap, setSnap] = useState<"peek" | "mid" | "full">("mid");
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFilters = useRef(filters);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      previousFilters.current = filters;
      return;
    }
    if (previousFilters.current !== filters) {
      setDraft(filters);
      previousFilters.current = filters;
    }
  }, [filters, open]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
    };
  }, [open]);

  function updateDraft(patch: Partial<SearchFilters>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function toggleType(type: PropertyType) {
    updateDraft({ type: toggleFilterValue(draft.type, type) });
  }

  function toggleAmenity(amenity: Amenity) {
    updateDraft({ amenities: toggleFilterValue(draft.amenities, amenity) });
  }

  function setRent(key: "minRent" | "maxRent", value: string) {
    const amount = value === "" ? undefined : Number(value);
    if (amount !== undefined && (!Number.isSafeInteger(amount) || amount < 0)) return;
    updateDraft({ [key]: amount });
  }

  const quickFilters: Array<{ label: string; active: boolean; activate: () => void }> = [
    {
      label: "Under ₱5,000",
      active: filters.maxRent === 5000 && filters.minRent === undefined,
      activate: () =>
        onChange({ ...filters, minRent: undefined, maxRent: filters.maxRent === 5000 ? undefined : 5000 }),
    },
    ...PROPERTY_TYPES.map((type) => ({
      label: TYPE_LABELS[type],
      active: filters.type.includes(type),
      activate: () => onChange({ ...filters, type: toggleFilterValue(filters.type, type) }),
    })),
    {
      label: "Air conditioning",
      active: filters.amenities.includes("aircon"),
      activate: () => onChange({ ...filters, amenities: toggleFilterValue(filters.amenities, "aircon") }),
    },
  ];

  return (
    <>
      <div className={styles.filterBar} aria-label="Rental filters">
        <div className={styles.pills} aria-label="Quick filters">
          {quickFilters.map((filter) => (
            <button
              key={filter.label}
              className={`${styles.pill} ${filter.active ? styles.pillActive : ""}`}
              type="button"
              aria-pressed={filter.active}
              onClick={filter.activate}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button className={styles.filterButton} type="button" onClick={() => { setDraft(filters); setOpen(true); }}>
          <SlidersHorizontal aria-hidden="true" size={17} />
          <span>Filters</span>
          {activeFilterCount > 0 && <span className={styles.count}>{activeFilterCount}</span>}
        </button>
      </div>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <section
            aria-labelledby="filter-title"
            className={`${styles.sheet} ${styles[`snap-${snap}`]}`}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => { dragStartY.current = event.touches[0]?.clientY ?? null; }}
            onTouchEnd={(event) => {
              const start = dragStartY.current;
              const end = event.changedTouches[0]?.clientY;
              if (start === null || end === undefined) return;
              const delta = start - end;
              if (delta > 40) setSnap((value) => value === "peek" ? "mid" : "full");
              else if (delta < -40) setSnap((value) => value === "full" ? "mid" : "peek");
            }}
          >
            <div className={styles.drawer} ref={dialogRef} role="dialog" tabIndex={-1}>
              <button
                aria-label="Resize filters sheet"
                className={styles.sheetHandle}
                type="button"
                onClick={() => setSnap((value) => value === "peek" ? "mid" : value === "mid" ? "full" : "peek")}
              ><span /></button>
              <header className={styles.header}>
                <div>
                  <h2 id="filter-title">Filters</h2>
                  <p>Find a rental that fits your needs.</p>
                </div>
                <button aria-label="Close filters" className={styles.iconButton} onClick={() => setOpen(false)} type="button"><X size={20} /></button>
              </header>

              <div className={styles.body}>
                <fieldset className={styles.fieldset}>
                  <legend>Property type</legend>
                  <div className={styles.optionGrid}>
                    {PROPERTY_TYPES.map((type) => (
                      <button aria-pressed={draft.type.includes(type)} className={`${styles.option} ${draft.type.includes(type) ? styles.optionSelected : ""}`} key={type} onClick={() => toggleType(type)} type="button">{TYPE_LABELS[type]}</button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Monthly rent (PHP)</legend>
                  <div className={styles.rentInputs}>
                    <label>Minimum<input inputMode="numeric" min="0" onChange={(event) => setRent("minRent", event.target.value)} placeholder="No minimum" type="number" value={draft.minRent ?? ""} /></label>
                    <label>Maximum<input inputMode="numeric" min="0" onChange={(event) => setRent("maxRent", event.target.value)} placeholder="No maximum" type="number" value={draft.maxRent ?? ""} /></label>
                  </div>
                  {!isRentRangeValid(draft) && <p className={styles.error} role="alert">Minimum rent cannot exceed maximum rent.</p>}
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Gender policy</legend>
                  <div className={styles.optionGrid}>
                    {GENDER_POLICIES.map((gender) => (
                      <button aria-pressed={draft.gender === gender} className={`${styles.option} ${draft.gender === gender ? styles.optionSelected : ""}`} key={gender} onClick={() => updateDraft({ gender: draft.gender === gender ? undefined : gender })} type="button">{GENDER_LABELS[gender]}</button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Amenities</legend>
                  <div className={styles.optionGrid}>
                    {AMENITIES.map((amenity) => (
                      <button aria-pressed={draft.amenities.includes(amenity)} className={`${styles.option} ${draft.amenities.includes(amenity) ? styles.optionSelected : ""}`} key={amenity} onClick={() => toggleAmenity(amenity)} type="button">{AMENITY_LABELS[amenity]}</button>
                    ))}
                  </div>
                </fieldset>
              </div>

              <footer className={styles.footer}>
                <button className={styles.clearButton} onClick={() => { onClear(); setDraft({ type: [], amenities: [] }); }} type="button">Clear all</button>
                <button className={styles.applyButton} disabled={!isRentRangeValid(draft)} onClick={() => { onChange(draft); setOpen(false); }} type="button">Show rentals{activeFilterCount ? ` (${activeFilterCount})` : ""}</button>
              </footer>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
