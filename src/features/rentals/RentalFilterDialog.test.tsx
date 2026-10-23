import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

vi.mock("@/components/ui/Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
import { DEFAULT_RENTAL_FILTERS } from "@/contracts/rental-filters";
import { RentalFilterDialog } from "./RentalFilterDialog";

it("renders every supported property category, curfew and trust controls", () => {
  const html = renderToStaticMarkup(<RentalFilterDialog filters={DEFAULT_RENTAL_FILTERS} open onApply={() => undefined} matchCount={0} />);
  for (const label of ["Private room", "Bedspace", "Boarding house", "Shared room", "Studio", "Apartment", "Condo", "House", "Curfew", "Verified listings", "Direct landlord"]) {
    expect(html).toContain(label);
  }
});
