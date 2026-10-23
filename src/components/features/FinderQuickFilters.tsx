"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Home, SlidersHorizontal, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PropertyType } from "@/contracts/rental-filters";
import styles from "./FinderQuickFilters.module.css";

const BUDGET_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Any maximum" },
  { value: 2500, label: "Up to ₱2,500" },
  { value: 3500, label: "Up to ₱3,500" },
  { value: 5000, label: "Up to ₱5,000" },
  { value: 8000, label: "Up to ₱8,000" },
];

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string; shortLabel: string }[] = [
  { value: "private_room", label: "Private room", shortLabel: "Room" },
  { value: "bedspace", label: "Bedspace", shortLabel: "Bedspace" },
  { value: "boarding_house", label: "Boarding house", shortLabel: "Boarding" },
  { value: "shared_room", label: "Shared room", shortLabel: "Shared" },
  { value: "studio", label: "Studio", shortLabel: "Studio" },
  { value: "apartment", label: "Apartment", shortLabel: "Apartment" },
  { value: "condo", label: "Condo", shortLabel: "Condo" },
  { value: "house", label: "House", shortLabel: "House" },
];

function compactPeso(value: number) {
  if (value >= 1000 && value % 1000 === 0) return `₱${value / 1000}k`;
  if (value >= 1000) return `₱${(value / 1000).toFixed(1)}k`;
  return `₱${value.toLocaleString("en-PH")}`;
}

function BudgetControl({ value, onApply }: { value: number | null; onApply: (value: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const options = BUDGET_OPTIONS.some((option) => option.value === value)
    ? BUDGET_OPTIONS
    : [...BUDGET_OPTIONS, { value, label: `Up to ₱${value?.toLocaleString("en-PH")}` }];
  const summary = value === null ? "Any" : `≤ ${compactPeso(value)}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => setOpen(false);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply(draft);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.filterChip} ${value !== null ? styles.hasValue : ""}`}
        aria-label={`Budget, ${value === null ? "any maximum" : `up to ${value.toLocaleString("en-PH")} pesos`}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setDraft(value); setOpen(true); }}
      >
        <span className={styles.filterLabel}><WalletCards size={13} aria-hidden="true" />Budget</span>
        <span className={styles.filterValue}>{summary}</span>
      </button>
      <dialog
        ref={dialogRef}
        className={`${styles.choiceDialog} ${styles.budgetDialog}`}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
      >
        <header className={styles.dialogHeader}>
          <h2 id={`${id}-title`}>Maximum monthly rent</h2>
          <p id={`${id}-description`}>Choose a quick ceiling. Set a full price range in All filters.</p>
        </header>
        <form className={styles.choiceForm} onSubmit={apply}>
          <fieldset className={styles.choiceFieldset}>
            <legend className={styles.visuallyHidden}>Maximum monthly rent</legend>
            <div className={styles.choiceList}>
              {options.map((option) => (
                <label className={styles.choiceOption} key={option.value ?? "any"}>
                  <input
                    type="radio"
                    name={`${id}-budget`}
                    value={option.value ?? ""}
                    checked={draft === option.value}
                    onChange={() => setDraft(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.choiceActions}>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Apply budget</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function TypeControl({ values, onApply }: { values: PropertyType[]; onApply: (values: PropertyType[]) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(values);
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selected = PROPERTY_TYPE_OPTIONS.filter((option) => values.includes(option.value));
  const summary = selected.length === 0 ? "Any" : selected.length === 1 ? selected[0].shortLabel : `${selected.length} types`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => setOpen(false);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply([...draft]);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.filterChip} ${values.length > 0 ? styles.hasValue : ""}`}
        aria-label={`Property type, ${selected.length === 0 ? "any type" : selected.map((option) => option.label).join(", ")}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setDraft(values); setOpen(true); }}
      >
        <span className={styles.filterLabel}><Home size={13} aria-hidden="true" />Type</span>
        <span className={styles.filterValue}>{summary}</span>
      </button>
      <dialog
        ref={dialogRef}
        className={`${styles.choiceDialog} ${styles.typeDialog}`}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
      >
        <header className={styles.dialogHeader}>
          <h2 id={`${id}-title`}>Property type</h2>
          <p id={`${id}-description`}>Select one or more kinds of rental.</p>
        </header>
        <form className={styles.choiceForm} onSubmit={apply}>
          <fieldset className={styles.choiceFieldset}>
            <div className={styles.choiceLegendRow}>
              <legend>Rental types</legend>
              <button type="button" className={styles.clearButton} onClick={() => setDraft([])} disabled={draft.length === 0}>Clear</button>
            </div>
            <div className={styles.choiceGrid}>
              {PROPERTY_TYPE_OPTIONS.map((option) => (
                <label className={`${styles.choiceOption} ${styles.checkboxOption}`} key={option.value}>
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={draft.includes(option.value)}
                    onChange={(event) => setDraft((current) => event.target.checked
                      ? [...current, option.value]
                      : current.filter((value) => value !== option.value))}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.choiceActions}>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Apply type</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export interface FinderQuickFiltersProps {
  selectedBudget: number | null;
  selectedPropertyTypes: PropertyType[];
  additionalFilterCount?: number;
  onBudgetChange: (maxPrice: number | null) => void;
  onPropertyTypesChange: (propertyTypes: PropertyType[]) => void;
  onOpenFilters: () => void;
}

export function FinderQuickFilters({
  selectedBudget,
  selectedPropertyTypes,
  additionalFilterCount = 0,
  onBudgetChange,
  onPropertyTypesChange,
  onOpenFilters,
}: FinderQuickFiltersProps) {
  return (
    <div className={styles.quickFiltersBar} role="group" aria-label="Refine rental search">
      <div className={styles.filterDock}>
        <BudgetControl value={selectedBudget} onApply={onBudgetChange} />
        <TypeControl values={selectedPropertyTypes} onApply={onPropertyTypesChange} />
        <button
          type="button"
          className={`${styles.filterChip} ${styles.allFiltersButton} ${additionalFilterCount > 0 ? styles.hasValue : ""}`}
          aria-label={`All filters${additionalFilterCount > 0 ? `, ${additionalFilterCount} more applied` : ""}`}
          onClick={onOpenFilters}
        >
          <span className={styles.filterLabel}><SlidersHorizontal size={13} aria-hidden="true" />Filters</span>
          <span className={styles.filterValue}>{additionalFilterCount > 0 ? `${additionalFilterCount} more` : "All"}</span>
          {additionalFilterCount > 0 && <span className={styles.filterBadge} aria-hidden="true">{additionalFilterCount}</span>}
        </button>
      </div>
    </div>
  );
}
