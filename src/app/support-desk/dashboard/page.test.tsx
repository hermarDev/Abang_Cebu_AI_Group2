import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sign: vi.fn(),
  getUser: vi.fn(),
  profile: vi.fn(),
  ticketCount: vi.fn(),
  attentionTickets: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) };
      }
      if (table === "support_tickets") {
        return {
          select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                in: (col: string, vals: string[]) => mocks.ticketCount({ op: "in", col, vals }),
                eq: (col: string, val: string) => mocks.ticketCount({ op: "eq", col, val }),
              };
            }
            return {
              in: (col: string, vals: string[]) => ({
                order: (orderCol: string, orderOpts: { ascending: boolean }) => ({
                  limit: (n: number) => mocks.attentionTickets({ col, vals, orderCol, orderOpts, limit: n }),
                }),
              }),
            };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: mocks.sign }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
  usePathname: () => "/support-desk/dashboard",
}));

import SupportDeskDashboardPage from "./page";

describe("support desk dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => {
      throw new Error("redirect");
    });
    mocks.notFound.mockImplementation(() => {
      throw new Error("not found");
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "supp-1" } }, error: null });
    mocks.profile.mockResolvedValue({
      data: { role: "customer_support", is_suspended: false, full_name: "Alex", avatar_url: null },
      error: null,
    });
    mocks.sign.mockResolvedValue("https://example.test/support.png");
    mocks.ticketCount.mockImplementation(async (query: { op: string; col: string; val?: string; vals?: string[] }) => {
      if (query.op === "in" && query.col === "status" && query.vals?.join(",") === "open,in_progress") {
        return { count: 4, error: null };
      }
      if (query.op === "eq" && query.col === "status" && query.val === "awaiting_landlord") {
        return { count: 2, error: null };
      }
      if (query.op === "eq" && query.col === "status" && query.val === "escalated") {
        return { count: 1, error: null };
      }
      if (query.op === "eq" && query.col === "status" && query.val === "resolved") {
        return { count: 9, error: null };
      }
      return { count: null, error: { message: "unexpected query" } };
    });
    mocks.attentionTickets.mockResolvedValue({
      data: [
        {
          id: "t-1",
          ticket_number: "SUP-01001",
          subject: "Deposit refund dispute",
          status: "escalated",
          priority: "urgent",
          requester_name: "Ria Renter",
          created_at: "2026-11-15T08:00:00Z",
        },
        {
          id: "t-2",
          ticket_number: "SUP-01002",
          subject: "Water outage complaint",
          status: "open",
          priority: "high",
          requester_name: "Ben Tenant",
          created_at: "2026-11-15T07:00:00Z",
        },
      ],
      error: null,
    });
  });

  it("signs the support avatar and passes it to the layout", async () => {
    mocks.profile.mockResolvedValueOnce({
      data: { role: "customer_support", is_suspended: false, full_name: "Sam Support", avatar_url: "supp-1/s.png" },
      error: null,
    });
    const jsx = await SupportDeskDashboardPage();
    expect(mocks.sign).toHaveBeenCalledWith("supp-1", "supp-1/s.png");
    expect(jsx.props.avatarUrl).toBe("https://example.test/support.png");
  });

  it("redirects guests and denies unauthorized or suspended profiles while allowing admins", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(SupportDeskDashboardPage()).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Fsupport-desk%2Fdashboard");

    for (const profile of [
      { role: "renter", is_suspended: false },
      { role: "landlord", is_suspended: false },
      { role: "verification_officer", is_suspended: false },
      { role: "customer_support", is_suspended: true },
      { role: "admin", is_suspended: true },
      null,
    ]) {
      mocks.profile.mockResolvedValueOnce({ data: profile, error: null });
      await expect(SupportDeskDashboardPage()).rejects.toThrow("not found");
    }

    mocks.profile.mockResolvedValueOnce({
      data: { role: "admin", is_suspended: false, full_name: "Ada Admin", avatar_url: null },
      error: null,
    });
    const adminHtml = renderToStaticMarkup(await SupportDeskDashboardPage());
    expect(adminHtml).toContain("Welcome back, Ada Admin");
  });

  it("renders support metrics in the 2-column Admin-style overview panel with existing queue action preserved", async () => {
    const html = renderToStaticMarkup(await SupportDeskDashboardPage());

    expect(html).toContain("Welcome back, Alex");
    expect(html).toContain("<h1 class=\"m-0 text-3xl font-bold tracking-tight\">Welcome back, Alex</h1>");
    expect(html).toContain("Monitor tenant complaints, landlord mediation, and escalation queues.");
    expect(html).toContain("Support overview");
    expect(html).toContain("sm:grid-cols-2");
    expect(html).not.toContain("lg:grid-cols-4");

    for (const [label, count, href] of [
      ["Open complaints", 4, "/support-desk/tickets?status=open"],
      ["Awaiting Landlord", 2, "/support-desk/tickets?status=awaiting_landlord"],
      ["Escalated to Admin", 1, "/support-desk/tickets?status=escalated"],
      ["Resolved", 9, "/support-desk/tickets?status=resolved"],
    ] as const) {
      expect(html).toMatch(
        new RegExp(`href="${href.replace("?", "\\?")}"[^>]*>[\\s\\S]*?tabular-nums[^>]*>${count}<[\\s\\S]*?${label}`),
      );
    }

    expect(html).toContain("Support Desk Queue");
    expect(html).toContain('href="/support-desk/tickets"');
    expect(html).toContain("Open Queue");
  });

  it("renders genuine zero counts when ticket totals are null or zero", async () => {
    mocks.ticketCount.mockResolvedValue({ count: 0, error: null });
    const html = renderToStaticMarkup(await SupportDeskDashboardPage());
    expect(html).toMatch(/tabular-nums[^>]*>0<[\s\S]*?Open complaints/);
    expect(html).toMatch(/tabular-nums[^>]*>0<[\s\S]*?Resolved/);
  });

  it("shows role=alert and em-dash placeholders when count queries fail instead of fake zeros", async () => {
    mocks.ticketCount.mockResolvedValue({ count: null, error: { message: "db timeout" } });
    const html = renderToStaticMarkup(await SupportDeskDashboardPage());

    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not load support ticket counts");
    expect(html).toContain('href="/support-desk/dashboard"');
    expect(html).toMatch(/tabular-nums[^>]*>—<[\s\S]*?Open complaints/);
    expect(html).not.toMatch(/tabular-nums[^>]*>0<[\s\S]*?Open complaints/);
  });

  it("renders compact Needs attention queue from real open/in_progress/escalated support_tickets", async () => {
    const html = renderToStaticMarkup(await SupportDeskDashboardPage());

    expect(mocks.attentionTickets).toHaveBeenCalledWith({
      col: "status",
      vals: ["open", "in_progress", "escalated"],
      orderCol: "created_at",
      orderOpts: { ascending: false },
      limit: 5,
    });
    expect(html).toContain("Needs attention");
    expect(html).toContain("rounded-2xl border border-border/90 bg-muted/20");
    expect(html).toContain("Deposit refund dispute");
    expect(html).toContain("SUP-01001");
    expect(html).toContain('href="/support-desk/tickets?status=escalated"');
    expect(html).toContain("Water outage complaint");
    expect(html).toContain('href="/support-desk/tickets?status=open"');
  });

  it("renders an honest empty state when no open, in_progress, or escalated tickets need attention", async () => {
    mocks.attentionTickets.mockResolvedValueOnce({ data: [], error: null });
    const html = renderToStaticMarkup(await SupportDeskDashboardPage());

    expect(html).toContain("Needs attention");
    expect(html).toContain("No open or escalated complaints need attention right now.");
  });

  it("handles support_tickets attention query without .order safely", async () => {
    mocks.ticketCount.mockResolvedValue({ count: 0, error: null });
    const prevImpl = mocks.attentionTickets.getMockImplementation();
    // Temporarily verify the page survives when attention query returns a direct promise without .order
    const serverModule = await import("@/lib/supabase/server");
    const origCreateClient = serverModule.createClient;
    vi.spyOn(serverModule, "createClient").mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: (table: string) => {
        if (table === "profiles") {
          return { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) };
        }
        if (table === "support_tickets") {
          return {
            select: () => ({
              in: () => Promise.resolve({ count: 0, data: null, error: null }),
              eq: () => Promise.resolve({ count: 0, error: null }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    } as never);

    const html = renderToStaticMarkup(await SupportDeskDashboardPage());
    expect(html).toContain("Needs attention");
    expect(html).toContain("No open or escalated complaints need attention right now.");
    void origCreateClient;
    if (prevImpl) mocks.attentionTickets.mockImplementation(prevImpl);
  });

  it("renders neutral 'Welcome back' fallback when support agent name is empty or whitespace", async () => {
    for (const emptyName of ["", "   ", null]) {
      mocks.profile.mockResolvedValueOnce({
        data: { role: "customer_support", is_suspended: false, full_name: emptyName },
        error: null,
      });
      const html = renderToStaticMarkup(await SupportDeskDashboardPage());
      expect(html).toContain("<h1 class=\"m-0 text-3xl font-bold tracking-tight\">Welcome back</h1>");
      expect(html).not.toContain("Welcome back,");
    }
  });
});
