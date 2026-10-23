import { expect, it } from "vitest";
import { searchPreviewRentals } from "./search";
import { DEFAULT_RENTAL_FILTERS } from "@/contracts/rental-filters";
import { SAMPLE_RENTALS } from "@/features/listings/preview-rentals";

it("keeps availability and enabled filters aligned with rental details", () => {
  expect(SAMPLE_RENTALS).toHaveLength(18);
  expect(searchPreviewRentals(SAMPLE_RENTALS, DEFAULT_RENTAL_FILTERS).some(({ id }) => id.startsWith("sample-unavailable"))).toBe(false);
  expect(searchPreviewRentals(SAMPLE_RENTALS, { ...DEFAULT_RENTAL_FILTERS, maxPrice: 2500 }).every((rental) => rental.price <= 2500)).toBe(true);
  expect(searchPreviewRentals(SAMPLE_RENTALS, { ...DEFAULT_RENTAL_FILTERS, wifiAvailable: true }).every((rental) => rental.wifiAvailable === true || rental.amenities.includes("Wi-Fi"))).toBe(true);
  expect(searchPreviewRentals(SAMPLE_RENTALS, DEFAULT_RENTAL_FILTERS, "IT Park").every((rental) => rental.locality.toLocaleLowerCase().includes("it park") || rental.title.toLocaleLowerCase().includes("it park"))).toBe(true);
});
