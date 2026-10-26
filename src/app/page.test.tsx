import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));
import Home from "./page";

it("renders the map-first finder without claiming unavailable rentals are live", async () => {
  const html = renderToStaticMarkup(await Home());

  expect(html).toContain("AbangCebu");
  expect(html).toContain('aria-label="Budget, any maximum"');
  expect(html).toContain('aria-label="Property type, Any"');
  expect(html).toContain('aria-label="Rental listings"');
  expect(html).toContain("Loading rentals…");
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('aria-label="Open account dialog"');
  expect(html).not.toContain('aria-label="Ask AbangCebu"');
  expect(html).toContain("Show listings");
  expect(html).toContain("Loading the interactive map…");
  expect(html).not.toContain("Garden room in Lahug");
});

it("uses verified authentication state for the drawer", async () => {
  auth.getUser.mockResolvedValueOnce({ data: { user: { id: "verified-user" } }, error: null });
  expect((await Home()).props.authenticated).toBe(true);
  auth.getUser.mockResolvedValueOnce({ data: { user: { id: "untrusted" } }, error: { message: "invalid" } });
  expect((await Home()).props.authenticated).toBe(false);
});
