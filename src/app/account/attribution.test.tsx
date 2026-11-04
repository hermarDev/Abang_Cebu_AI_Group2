import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountPage from "./page";

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "fixture", email: "fixture@example.test" } }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }));
vi.mock("./AccountMapBackground", () => ({ AccountMapBackground: () => null }));
vi.mock("./AccountSettingsForm", () => ({ AccountSettingsForm: () => null }));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: async () => null }));

describe("account map attribution", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps provider credits visible in a compact disclosure", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_STYLE_URL", "/styles/osm.json");
    const html = renderToStaticMarkup(await AccountPage());
    expect(html).toMatch(/<details[^>]*\sopen=""/);
    expect(html).toContain("<summary");
    expect(html).toContain("OpenFreeMap");
    expect(html).toContain("© OpenMapTiles");
    expect(html).toContain("© OpenStreetMap contributors");
  });
});
