"use client";

import { useState } from "react";
import type { RentalFilters, PropertyType } from "@/contracts/rental-filters";
import { formatPrice } from "@/features/rentals/search";
import { Button } from "@/components/ui/Button";
import * as RadixPopover from "@radix-ui/react-popover";
import { SlidersHorizontal } from "lucide-react";
import styles from "./FinderQuickFilters.module.css";

export const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "private_room", label: "Private room" }, { value: "bedspace", label: "Bedspace" },
  { value: "boarding_house", label: "Boarding house" }, { value: "shared_room", label: "Shared room" },
  { value: "studio", label: "Studio" }, { value: "apartment", label: "Apartment" },
  { value: "condo", label: "Condo" }, { value: "house", label: "House" },
];

const budgetOptions: { value: number | null; label: string }[] = [
  { value: null, label: "Any maximum" }, { value: 2500, label: "Up to ₱2,500" },
  { value: 3500, label: "Up to ₱3,500" }, { value: 5000, label: "Up to ₱5,000" },
  { value: 8000, label: "Up to ₱8,000" },
];

const isActive = (value: unknown) => Array.isArray(value)
  ? value.length > 0
  : value !== null && value !== undefined && value !== false && value !== "any";

export function getActiveFilterCount(filters: RentalFilters) {
  const categories = [
    [filters.minPrice, filters.maxPrice],
    [filters.propertyTypes, filters.furnishingTypes],
    [filters.occupants, filters.bathroom, filters.wifiAvailable, filters.wifiIncluded, filters.wfhSuitable, filters.minInternetSpeedMbps, filters.cookingAllowed, filters.laundryAllowed, filters.kitchenAvailable, filters.laundryArea, filters.aircon, filters.electricFan, filters.terrace, filters.motorcycleParking, filters.carParking, filters.bicycleParking, filters.waterPricingType, filters.waterIncluded, filters.waterFee, filters.electricityPricingType, filters.electricityIncluded, filters.electricitySubmetered, filters.electricityRatePerKwh, filters.electricityFixedFee],
    [filters.tenantPolicy, filters.curfewType, filters.curfewTime, filters.visitorsPolicy, filters.petsAllowed, filters.childrenAllowed, filters.smokingAllowed, filters.availableBy, filters.maxMinimumStayMonths, filters.maxAdvanceMonths, filters.maxDepositMonths, filters.gated, filters.cctv, filters.securityGuard, filters.ownEntrance, filters.wellLitEntrance, filters.landlordReportsNoFlooding, filters.verifiedOnly, filters.directLandlordOnly, filters.exactLocationVerified, filters.listedWithinDays],
  ];
  return categories.filter((category) => category.some(isActive)).length;
}

export function QuickFilters({ filters, onChange, onOpenFilters }: {
  filters: RentalFilters;
  onChange: (filters: RentalFilters) => void;
  onOpenFilters: () => void;
  mapRadius: number;
  onRadiusChange: (radius: number) => void;
}) {
  const [budgetDraft, setBudgetDraft] = useState(filters.maxPrice ?? null);
  const [typeDraft, setTypeDraft] = useState<PropertyType[]>(filters.propertyTypes);
  const activeCount = getActiveFilterCount(filters);
  const budgetLabel = filters.maxPrice == null ? "Budget" : `Up to ${formatPrice(filters.maxPrice)}`;
  const typeLabel = filters.propertyTypes.length === 0
    ? "Property type"
    : filters.propertyTypes.length === 1
      ? propertyTypes.find((item) => item.value === filters.propertyTypes[0])?.label ?? "Property type"
      : `${filters.propertyTypes.length} types`;

  return <div className={styles.quickFilters} role="group" aria-label="Rental search filters">
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild><button className={styles.filterButton} type="button" aria-label={`Budget${filters.maxPrice == null ? ", any maximum" : `, up to ${filters.maxPrice.toLocaleString("en-PH")} pesos`}`} onClick={() => setBudgetDraft(filters.maxPrice ?? null)}>{budgetLabel}</button></RadixPopover.Trigger>
      <RadixPopover.Portal><RadixPopover.Content className={styles.filterPopover} align="start" sideOffset={8} aria-label="Budget filter">
        <form onSubmit={(event) => { event.preventDefault(); onChange({ ...filters, maxPrice: budgetDraft }); }}>
          <fieldset className={styles.choiceList}><legend className="sr-only">Maximum monthly rent</legend>{budgetOptions.map((option) => <label key={option.value ?? "any"}><input type="radio" name="quick-budget" checked={budgetDraft === option.value} onChange={() => setBudgetDraft(option.value)} /><span>{option.label}</span></label>)}</fieldset>
          <div className={styles.popoverActions}><RadixPopover.Close asChild><Button type="button" onClick={() => onChange({ ...filters, maxPrice: budgetDraft })}>Apply budget</Button></RadixPopover.Close></div>
        </form>
      </RadixPopover.Content></RadixPopover.Portal>
    </RadixPopover.Root>
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild><button className={styles.filterButton} type="button" aria-label={`Property type, ${filters.propertyTypes.length ? filters.propertyTypes.map((value) => propertyTypes.find((item) => item.value === value)?.label ?? value).join(", ") : "Any"}`} onClick={() => setTypeDraft(filters.propertyTypes)}>{typeLabel}</button></RadixPopover.Trigger>
      <RadixPopover.Portal><RadixPopover.Content className={styles.filterPopover} align="start" sideOffset={8} aria-label="Property type filter">
        <fieldset className={styles.typeList}><legend className={styles.legendRow}>Rental types <button type="button" className={styles.clearButton} onClick={() => setTypeDraft([])}>Clear</button></legend>{propertyTypes.map((item) => <label key={item.value}><input type="checkbox" checked={typeDraft.includes(item.value)} onChange={(event) => setTypeDraft((current) => event.target.checked ? [...current, item.value] : current.filter((value) => value !== item.value))} /><span>{item.label}</span></label>)}</fieldset>
        <div className={styles.popoverActions}><RadixPopover.Close asChild><Button type="button" onClick={() => onChange({ ...filters, propertyTypes: typeDraft })}>Apply types</Button></RadixPopover.Close></div>
      </RadixPopover.Content></RadixPopover.Portal>
    </RadixPopover.Root>
    <button className={`${styles.filterButton} ${styles.filtersButton}`} type="button" aria-haspopup="dialog" onClick={onOpenFilters} aria-label={`Filters${activeCount ? `, ${activeCount} active filter categories` : ""}`}><SlidersHorizontal size={16} aria-hidden="true" /><span>Filters</span>{activeCount > 0 && <span className={styles.activeCount} aria-hidden="true">{activeCount}</span>}</button>
  </div>;
}
