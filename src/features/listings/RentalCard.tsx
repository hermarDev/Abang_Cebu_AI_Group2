import type { RentalResult } from "@/contracts/preview";
import { Building2 } from "lucide-react";
import { formatPrice } from "@/features/rentals/search";
import { propertyTypes } from "@/features/map/FinderQuickFilters";
import styles from "@/features/map/RestoredFinderShell.module.css";

export function RentalCard({ rental, selected, onSelect }: { rental: RentalResult; selected: boolean; onSelect: (id: string) => void }) {
  return <article className={styles.rentalCard}>
    <div className={styles.noPhoto}><Building2 size={22} aria-hidden="true" /><span>No photos provided</span></div>
    <span className={styles.category}>{propertyTypes.find(({ value }) => value === (rental.propertyType ?? rental.type))?.label ?? rental.type.replaceAll(/[-_]/g, " ")}</span>
    <h2><button id={`rental-card-${rental.id}`} type="button" aria-pressed={selected} onClick={() => onSelect(rental.id)}>{rental.title}</button></h2><p className={styles.price}>{formatPrice(rental.price)}<span> / month · per {rental.basis}</span></p>
    <p>{rental.locality}</p><p>{rental.description}</p>
    {rental.amenities.length > 0 && <ul className={styles.amenities} aria-label="Amenities">{rental.amenities.map((amenity, index) => <li key={`${amenity}-${index}`}>{amenity}</li>)}</ul>}
  </article>;
}
