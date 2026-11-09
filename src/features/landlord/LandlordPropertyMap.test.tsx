import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => ({ setWorkerUrl: vi.fn(), AttributionControl: vi.fn(), LngLatBounds: vi.fn(), Map: vi.fn(), Marker: vi.fn(), Popup: vi.fn() }));
import { ExpandedPropertyView, LandlordPropertyMap, type LandlordPropertyMapItem } from "./LandlordPropertyMap";

const base = { price: 5000, property_type: "boarding_house", address: "1 St", city: "Cebu", latitude: 10.3, longitude: 123.9, is_available: true };
const properties: LandlordPropertyMapItem[] = [
  { ...base, id: "pending", title: "Pending room", status: "pending", editHref: "/list-property?draftId=d1&revision=2" },
  { ...base, id: "rejected", title: "Rejected house", status: "rejected", editHref: "/list-property?draftId=d2&revision=4" },
  { ...base, id: "approved", title: "Approved flat", status: "approved", editHref: null },
  { ...base, id: "published", title: "Old listing", status: "published", is_available: false },
];
const source = readFileSync("src/features/landlord/LandlordPropertyMap.tsx", "utf8");
const pressed = (html: string) => [...html.matchAll(/aria-pressed="true"[^>]*>.*?class="[^"]*">([^<]+)</g)].map(match => match[1]);

describe("LandlordPropertyMap", () => {
  it("labels submitted property review states", () => {
    const html = renderToStaticMarkup(<LandlordPropertyMap properties={properties} />);
    expect(html).toContain("Pending review");
    expect(html).toContain("Changes requested");
    expect(html).toContain("Published · Available");
    expect(html).toContain("Published · Unavailable");
    expect(html).not.toContain("Live · Available");
    expect(html).toContain('data-status="pending"');
  });
  it("renders Edit submission links beside, not inside, the card buttons", () => {
    const html = renderToStaticMarkup(<LandlordPropertyMap properties={properties} />);
    expect(html).toContain('href="/list-property?draftId=d1&amp;revision=2"');
    expect(html).toContain('href="/list-property?draftId=d2&amp;revision=4"');
    expect(html.match(/Edit submission/g)).toHaveLength(2);
    for (const button of html.match(/<button[^>]*aria-pressed[\s\S]*?<\/button>/g) ?? []) expect(button).not.toContain("<a");
  });
  it("selects initialSelectedId when it matches and falls back to the first property", () => {
    expect(pressed(renderToStaticMarkup(<LandlordPropertyMap properties={properties} initialSelectedId="rejected" />))).toEqual(["Rejected house"]);
    expect(pressed(renderToStaticMarkup(<LandlordPropertyMap properties={properties} initialSelectedId="missing" />))).toEqual(["Pending room"]);
    expect(pressed(renderToStaticMarkup(<LandlordPropertyMap properties={properties} />))).toEqual(["Pending room"]);
  });
  it("centers on the selected property and adds edit links to popups", () => {
    expect(source).toContain("markerRefs.current[selectedIndex]?.togglePopup()");
    expect(source).toContain('edit.textContent = "Edit submission"');
  });
  it("shows cover photos and an Expand button outside the card button", () => {
    const withPhotos = [{ ...properties[0], imageUrls: ["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"] }, properties[1]];
    const html = renderToStaticMarkup(<LandlordPropertyMap properties={withPhotos} />);
    expect(html.match(/<img(?=[^>]*src="https:\/\/cdn\.test\/a\.jpg")(?=[^>]*alt="Photo of Pending room")[^>]*>/g)).toHaveLength(1);
    expect(html).not.toContain("b.jpg");
    expect(html.match(/aria-label="Expand [^"]+"/g)).toEqual(['aria-label="Expand Pending room"', 'aria-label="Expand Rejected house"']);
    for (const button of html.match(/<button[^>]*aria-pressed[\s\S]*?<\/button>/g) ?? []) expect(button).not.toContain("Expand");
    expect(source).toContain("styles.popupExpandButton");
    expect(source).toContain('"Expand " + property.title');
  });
  it("renders the expanded multi-photo viewer and details", () => {
    const property = { ...properties[0], imageUrls: ["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"], description: "Near IT Park", amenities: ["wifi", "parking"] };
    const html = renderToStaticMarkup(<ExpandedPropertyView property={property} photoIndex={1} onPhotoIndexChange={() => undefined} />);
    expect(html).toContain('src="https://cdn.test/b.jpg"');
    expect(html).toContain("2 / 2");
    expect(html).toContain('aria-label="Previous photo"');
    expect(html).toContain('aria-label="Next photo"');
    expect(html).toContain("Pending review");
    expect(html).toContain("Near IT Park");
    expect(html).toContain("<li>parking</li>");
    expect(html).toContain("Edit submission");
  });
  it("shows a placeholder and no photo controls without photos", () => {
    const html = renderToStaticMarkup(<ExpandedPropertyView property={properties[2]} photoIndex={0} onPhotoIndexChange={() => undefined} />);
    expect(html).toContain("No photos uploaded");
    expect(html).not.toContain("Next photo");
    expect(html).not.toContain("Edit submission");
  });
  it("renders panel collapse and fit all properties controls", () => {
    const html = renderToStaticMarkup(<LandlordPropertyMap properties={properties} />);
    expect(html).toContain('aria-label="Collapse properties panel"');
    expect(html).toContain('title="Fit all properties"');
    expect(source).toContain('"View property details ↗"');
    expect(source).toContain("setPanelCollapsed");
    expect(source).toContain("fitAllProperties");
  });
});
