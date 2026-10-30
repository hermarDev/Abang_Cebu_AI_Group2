import type { RentalResult } from "@/contracts/preview";
import { Bookmark, Building2 } from "lucide-react";
import Image from "next/image";
import { formatPrice } from "@/features/rentals/search";
import { propertyTypes } from "@/features/map/FinderQuickFilters";
import styles from "@/features/map/RestoredFinderShell.module.css";

export function RentalCard({
  rental,
  selected,
  onSelect,
  saved = false,
  canSave = false,
  onToggleSaved,
}: {
  rental: RentalResult;
  selected: boolean;
  onSelect: (id: string) => void;
  saved?: boolean;
  canSave?: boolean;
  onToggleSaved?: (id: string) => void;
}) {
  return <article className={styles.rentalCard}>
    <div className={styles.rentalPhotoFrame}>
      {rental.imageUrls?.[0]
        ? <Image src={rental.imageUrls[0]} alt={"Photo of " + rental.title} width={800} height={480} unoptimized className={styles.rentalPhoto} />
        : <div className={styles.noPhoto}><Building2 size={22} aria-hidden="true" /><span>No photos provided</span></div>}
      {canSave && <button
        type="button"
        className={styles.favoriteButton}
        aria-label={(saved ? "Remove " : "Save ") + rental.title + " " + (saved ? "from" : "to") + " saved rentals"}
        aria-pressed={saved}
        title={saved ? "Remove from saved rentals" : "Save rental"}
        onClick={(event) => { event.stopPropagation(); onToggleSaved?.(rental.id); }}
      ><Bookmark size={18} aria-hidden="true" fill={saved ? "currentColor" : "none"} /></button>}
    </div>
    <span className={styles.category}>{propertyTypes.find(({ value }) => value === (rental.propertyType ?? rental.type))?.label ?? rental.type.replaceAll(/[-_]/g, " ")}</span>
    <h2><button id={"rental-card-" + rental.id} type="button" aria-pressed={selected} onClick={() => onSelect(rental.id)}>{rental.title}</button></h2><p className={styles.price}>{formatPrice(rental.price)}<span> / month · per {rental.basis}</span></p>
    <p>{rental.address ?? rental.locality}</p><p>{rental.description}</p>
    {rental.amenities.length > 0 && <ul className={styles.amenities} aria-label="Amenities">{rental.amenities.map((amenity, index) => <li key={amenity + "-" + index}>{amenity}</li>)}</ul>}
  </article>;
}