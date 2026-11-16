import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sign: vi.fn(), getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: mocks.sign }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound, usePathname: () => "/verification/dashboard" }));
import VerificationDashboardPage from "./page";

const queueItems = [
  { id: "p1", title: "Property 1", fieldVerificationStatus: "pending_verification", landlordId: "l1", landlordName: "L1", landlordPhone: "123" },
  { id: "p2", title: "Property 2", fieldVerificationStatus: "verified", landlordId: "l2", landlordName: "L2", landlordPhone: "456" },
  { id: "p3", title: "Property 3", fieldVerificationStatus: "flagged", landlordId: "l3", landlordName: "L3", landlordPhone: "789" },
  { id: "p4", title: "Property 4", fieldVerificationStatus: "pending_verification", landlordId: "l4", landlordName: "L4", landlordPhone: "012" },
  { id: "p5", title: "Property 5", fieldVerificationStatus: "pending_verification", landlordId: "l5", landlordName: "L5", landlordPhone: "345" },
  { id: "p6", title: "Property 6", fieldVerificationStatus: "pending_verification", landlordId: "l6", landlordName: "L6", landlordPhone: "678" },
];

describe("verification dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
    mocks.notFound.mockImplementation(() => { throw new Error("not found"); });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "verif-1" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "verification_officer", is_suspended: false, full_name: "Alex" }, error: null });
    mocks.rpc.mockResolvedValue({ data: queueItems, error: null });
    mocks.sign.mockResolvedValue("https://example.test/verif.png");
  });

  it("signs the verifier avatar and passes it to the layout", async () => {
    mocks.profile.mockResolvedValueOnce({ data: { role: "verification_officer", is_suspended: false, full_name: "Vera Verifier", avatar_url: "verif-1/a.png" }, error: null });
    const jsx = await VerificationDashboardPage();
    expect(mocks.sign).toHaveBeenCalledWith("verif-1", "verif-1/a.png");
    expect(jsx.props.avatarUrl).toBe("https://example.test/verif.png");
  });

  it("redirects guests and denies other roles and suspended verifiers", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(VerificationDashboardPage()).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Fverification%2Fdashboard");
    for (const profile of [{ role: "renter", is_suspended: false }, { role: "landlord", is_suspended: false }, { role: "verification_officer", is_suspended: true }, null]) {
      mocks.profile.mockResolvedValueOnce({ data: profile, error: null });
      await expect(VerificationDashboardPage()).rejects.toThrow("not found");
    }
  });

  it("renders 3 clickable KPI cards in Admin-style 2-column overview without a fake 4th card", async () => {
    const html = renderToStaticMarkup(await VerificationDashboardPage());
    expect(mocks.rpc).toHaveBeenCalledWith("verifier_list_queue", { p_status: null, p_search: null, p_limit: 100, p_offset: 0 });
    expect(html).toContain("Welcome back, Alex");
    expect(html).toContain("<h1 class=\"m-0 text-3xl font-bold tracking-tight\">Welcome back, Alex</h1>");
    expect(html).toContain("Overview of landlord listing verifications, site visits, and pending inspection queues.");
    expect(html).toContain("Verification overview");
    expect(html).toContain("rounded-3xl border border-border bg-card");
    expect(html).toContain("sm:grid-cols-2");
    expect(html).not.toContain("sm:grid-cols-3");
    // KPI cards with links to queue filtered by status and Admin-style tabular-nums before label
    expect(html).toMatch(/href="\/verification\/queue\?status=pending_verification"[^>]*>[\s\S]*?tabular-nums[^>]*>4<[\s\S]*?Pending verification/);
    expect(html).toMatch(/href="\/verification\/queue\?status=verified"[^>]*>[\s\S]*?tabular-nums[^>]*>1<[\s\S]*?Verified/);
    expect(html).toMatch(/href="\/verification\/queue\?status=flagged"[^>]*>[\s\S]*?tabular-nums[^>]*>1<[\s\S]*?Flagged/);
    // Semantic icon badges (amber/emerald/rose)
    expect(html).toMatch(/bg-amber-500\/10 text-amber-600 dark:text-amber-400/);
    expect(html).toMatch(/bg-emerald-500\/10 text-emerald-600 dark:text-emerald-400/);
    expect(html).toMatch(/bg-rose-500\/10 text-rose-600 dark:text-rose-400/);
    // ArrowUpRight on DashboardStatCard
    expect(html).toMatch(/lucide-arrow-up-right/);
  });

  it("shows RPC error cleanly with role=alert retry box", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const html = renderToStaticMarkup(await VerificationDashboardPage());
    expect(html).toMatch(/role="alert"/);
    expect(html).toMatch(/Could not load the verification queue/);
    expect(html).toMatch(/Try again/);
    expect(html).toMatch(/href="\/verification\/dashboard"/);
  });

  it("integrates 'Needs inspection' panel with up to 5 latest pending items linking to queue with propertyId", async () => {
    const html = renderToStaticMarkup(await VerificationDashboardPage());
    // Integrated Admin-style Needs inspection inside overview
    expect(html).toMatch(/Needs inspection/);
    expect(html).toContain("rounded-2xl border border-border/90 bg-muted/20");
    // Links to /verification/queue?status=pending_verification&propertyId=<id> (HTML encodes & as &amp;)
    expect(html).toMatch(/href="\/verification\/queue\?status=pending_verification&amp;propertyId=p1"/);
    expect(html).toMatch(/href="\/verification\/queue\?status=pending_verification&amp;propertyId=p4"/);
    expect(html).toMatch(/href="\/verification\/queue\?status=pending_verification&amp;propertyId=p5"/);
    expect(html).toMatch(/href="\/verification\/queue\?status=pending_verification&amp;propertyId=p6"/);
  });

  it("shows empty state when no pending items", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ id: "p1", fieldVerificationStatus: "verified" }], error: null });
    const html = renderToStaticMarkup(await VerificationDashboardPage());
    expect(html).toMatch(/All submitted listings have been inspected/);
  });

  it("renders Quick Actions banner with Verification map and Open Queue links", async () => {
    const html = renderToStaticMarkup(await VerificationDashboardPage());
    expect(html).toMatch(/Field Verification Queue/);
    expect(html).toMatch(/Verification map/);
    expect(html).toMatch(/href="\/verification\/map"/);
    expect(html).toMatch(/Open Queue/);
    expect(html).toMatch(/href="\/verification\/queue"/);
  });

  it("renders collapsible details Standard Field Verification Workflow keeping all 5 steps", async () => {
    const html = renderToStaticMarkup(await VerificationDashboardPage());
    expect(html).toMatch(/<details[^>]*>[\s\S]*?<summary[^>]*>[\s\S]*?Standard Field Verification Workflow[\s\S]*?<\/summary>/);
    expect(html).toMatch(/Review property submission/);
    expect(html).toMatch(/Coordinate site visit/);
    expect(html).toMatch(/Record detailed notes/);
    expect(html).toMatch(/Upload proof images/);
    expect(html).toMatch(/Mark the property as verified/);
  });

  it("renders genuine zero counts when queue is empty", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    const html = renderToStaticMarkup(await VerificationDashboardPage());
    expect(html).toMatch(/tabular-nums[^>]*>0<[\s\S]*?Pending verification/);
    expect(html).toMatch(/tabular-nums[^>]*>0<[\s\S]*?Verified/);
    expect(html).toMatch(/tabular-nums[^>]*>0<[\s\S]*?Flagged/);
  });

  it("renders neutral 'Welcome back' fallback when verifier name is empty or whitespace", async () => {
    for (const emptyName of ["", "   ", null]) {
      mocks.profile.mockResolvedValueOnce({
        data: { role: "verification_officer", is_suspended: false, full_name: emptyName },
        error: null,
      });
      const html = renderToStaticMarkup(await VerificationDashboardPage());
      expect(html).toContain("<h1 class=\"m-0 text-3xl font-bold tracking-tight\">Welcome back</h1>");
      expect(html).not.toContain("Welcome back,");
    }
  });
});