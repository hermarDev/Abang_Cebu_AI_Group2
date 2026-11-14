import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountPage from "./page";

const fixture = vi.hoisted(() => ({ profile: null as null | { full_name: string; phone_number: null; role: string; avatar_url: null } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "fixture", email: "fixture@example.test" } }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: fixture.profile, error: null }) }) }) }) }) }));
vi.mock("./AccountMapBackground", () => ({ AccountMapBackground: () => <div data-testid="account-map-background" /> }));
vi.mock("./AccountSettingsForm", () => ({ AccountSettingsForm: () => null }));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: async () => null }));

describe("account map attribution", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns landlords to their workspace and renters to the map", async () => {
    fixture.profile = { full_name: "Landlord", phone_number: null, role: "landlord", avatar_url: null };
    const landlord = renderToStaticMarkup(await AccountPage());
    expect(landlord).toContain('href="/landlord/dashboard"');
    expect(landlord).toContain("Back to workspace");
    fixture.profile = { ...fixture.profile, role: "renter" };
    const renter = renderToStaticMarkup(await AccountPage());
    expect(renter).toContain("Back to map");
    fixture.profile = { ...fixture.profile, role: "admin" };
    const admin = renderToStaticMarkup(await AccountPage());
    expect(admin).toContain('href="/admin/dashboard"');
    expect(admin).toContain("Back to admin workspace");
    fixture.profile = null;
  });

  it("renders a neutral background without a map or credits", async () => {
    for (const style of ["/styles/osm.json", "https://example.test/custom-style.json"]) {
      vi.stubEnv("NEXT_PUBLIC_MAP_STYLE_URL", style);
      const html = renderToStaticMarkup(await AccountPage());
      expect(html).not.toContain("account-map-background");
      expect(html).not.toContain("maplibregl-ctrl-attrib");
      expect(html).not.toContain("OpenStreetMap");
      expect(html).toContain("bg-background");
    }
  });

  it("renders a full-width sticky top bar and un-boxed page heading aligned to max-w-5xl", async () => {
    fixture.profile = { full_name: "Admin User", phone_number: null, role: "admin", avatar_url: null };
    const html = renderToStaticMarkup(await AccountPage());
    expect(html).toContain("border-b border-border/70 bg-background/95");
    expect(html).not.toContain("bg-white/90");
    expect(html).not.toContain("dark:bg-slate-950/90");
    expect(html).not.toContain("max-w-6xl");
    expect(html).toContain("max-w-5xl");
    expect(html).not.toContain("Your account");
    fixture.profile = null;
  });
});
