import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AccountPage from "./page";

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "fixture", email: "fixture@example.test" } }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }));
vi.mock("./AccountMapBackground", () => ({ AccountMapBackground: () => null }));
vi.mock("./AccountSettingsForm", () => ({ AccountSettingsForm: () => null }));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: async () => null }));

describe("account map attribution", () => {
  it("keeps provider credits available in a compact disclosure", async () => {
    const html = renderToStaticMarkup(await AccountPage());
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain("OpenFreeMap");
    expect(html).toContain("© OpenMapTiles");
    expect(html).toContain("© OpenStreetMap contributors");
  });
});
