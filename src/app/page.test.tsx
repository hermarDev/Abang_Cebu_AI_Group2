import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: vi.fn().mockResolvedValue(null) }));

const auth = vi.hoisted(() => ({ getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  }),
}));

import { FinderPage } from "@/features/map/FinderPage";
import Home from "./page";

it("renders the map-first finder without claiming unavailable rentals are live", async () => {
  const html = renderToStaticMarkup(await FinderPage());

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
  auth.getUser.mockResolvedValueOnce({ data: { user: { id: "verified-user", user_metadata: {} } }, error: null });
  expect((await FinderPage()).props.authenticated).toBe(true);
  auth.getUser.mockResolvedValueOnce({ data: { user: { id: "untrusted" } }, error: { message: "invalid" } });
  expect((await FinderPage()).props.authenticated).toBe(false);
});

it("delegates to FinderPage with landlord redirect configured", () => {
  const element = Home();
  expect(element.props.landlordRedirectTo).toBe("/landlord/dashboard");
});
