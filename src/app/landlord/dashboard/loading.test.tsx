import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LandlordDashboardLoading from "./loading";

describe("LandlordDashboardLoading", () => {
  it("renders accessible loading container with role status and polite live region", () => {
    const html = renderToStaticMarkup(<LandlordDashboardLoading />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Loading landlord dashboard"');
    expect(html).toContain("Loading landlord dashboard…");
  });

  it("mirrors the workspace layout shell with sidebar and 4 KPI skeletons", () => {
    const html = renderToStaticMarkup(<LandlordDashboardLoading />);

    expect(html).toContain("Landlord workspace");
    expect(html).toContain("<aside");
    expect(html).toContain('data-skeleton="active-nav"');
    expect(html).toContain("lg:grid-cols-[248px_minmax(0,1fr)]");
    expect(html).toContain("grid grid-cols-2 gap-3 xl:grid-cols-4");
  });
});
