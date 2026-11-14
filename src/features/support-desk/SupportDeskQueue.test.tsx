import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/AppToaster", () => ({ notify: vi.fn() }));

import {
  SupportDeskQueue,
  SupportTicketRow,
  loadSupportDeskTickets,
  submitSupportAction,
  type SupportDeskTicket,
} from "./SupportDeskQueue";

const ticket: SupportDeskTicket = {
  id: "t-1",
  requesterName: "Juan Dela",
  requesterEmail: "juan@example.local",
  requesterRole: "renter",
  category: "messaging_safety",
  subject: "Threatening message from landlord",
  description: "Landlord threatened to lock me out without notice.",
  status: "open",
  priority: "high",
  reportedLandlordId: "l-1",
  reportedLandlordName: "Pedro Landlord",
  createdAt: "2026-11-14T01:00:00Z",
};

const row = (t: SupportDeskTicket) =>
  renderToStaticMarkup(
    <ul>
      <SupportTicketRow ticket={t} onAct={() => {}} />
    </ul>,
  );

afterEach(() => vi.unstubAllGlobals());

describe("SupportDeskQueue", () => {
  it("renders status filter tabs with initial status active", () => {
    const html = renderToStaticMarkup(
      <SupportDeskQueue userId="supp-1" initialStatus="awaiting_landlord" />,
    );
    for (const tab of ["Open", "In Progress", "Awaiting Landlord", "Escalated", "Resolved", "All"]) {
      expect(html).toContain(tab);
    }
    expect(html).toMatch(/aria-pressed="true"[^>]*>Awaiting Landlord/);
    expect(html).toContain("animate-pulse");
  });

  it("renders ticket details and action buttons for open tickets", () => {
    const openHtml = row(ticket);
    expect(openHtml).toContain("Threatening message from landlord");
    expect(openHtml).toContain("Juan Dela");
    expect(openHtml).toContain("Pedro Landlord");
    expect(openHtml).toContain("Request Landlord Response");
    expect(openHtml).toMatch(/Mark Settled (&amp;|&) Resolved/);
    expect(openHtml).toContain("Escalate to Admin");
  });

  it("hides request landlord button when already awaiting landlord", () => {
    const awaitingHtml = row({
      ...ticket,
      status: "awaiting_landlord",
      landlordInquiryNote: "Please clarify lock replacement policy",
    });
    expect(awaitingHtml).toContain("Inquiry sent to landlord:");
    expect(awaitingHtml).toContain("Please clarify lock replacement policy");
    expect(awaitingHtml).not.toContain("Request Landlord Response");
    expect(awaitingHtml).toMatch(/Mark Settled (&amp;|&) Resolved/);
    expect(awaitingHtml).toContain("Escalate to Admin");
  });

  it("submits action with operationId and payload to api", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: { success: true } }),
      }),
    );

    const res = await submitSupportAction("supp-1", ticket.id, {
      operationId: "88100000-0000-4000-8000-000000000001",
      action: "request_landlord_response",
      note: "Please provide your side of the story",
      reportedLandlordId: "l-1",
    });

    expect(res.ok).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/support-desk/tickets/t-1",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-expected-user-id": "supp-1" }),
      }),
    );
  });

  it("uses keyset cursor pagination across batches instead of mutable offset", async () => {
    const batch = Array.from({ length: 100 }, (_, i) => ({
      ...ticket,
      id: `t-${i}`,
      createdAt: `2026-11-14T01:${String(59 - Math.floor(i / 2)).padStart(2, "0")}:00Z`,
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tickets: batch }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tickets: [{ ...ticket, id: "t-100", createdAt: "2026-11-14T00:00:00Z" }] }) });
    vi.stubGlobal("fetch", fetchMock);

    const loaded = await loadSupportDeskTickets("supp-1", "open", "");
    expect(loaded).toHaveLength(101);
    const secondUrl = String(fetchMock.mock.calls[1][0]);
    expect(secondUrl).toContain("cursorId=t-99");
    expect(secondUrl).toContain("cursorCreatedAt=");
    expect(secondUrl).not.toContain("offset=");
  });
});
