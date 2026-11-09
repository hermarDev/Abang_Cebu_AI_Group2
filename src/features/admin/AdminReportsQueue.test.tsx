import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/AppToaster", () => ({ notify: vi.fn() }));
import { AdminReportsQueue, EvidenceView, inspectReport, ReportRow, submitReportDecision, type AdminReport } from "./AdminReportsQueue";

const report: AdminReport = { id: "r1", reporterName: "Renter One", targetType: "message", targetUserId: "u3", targetUserName: "Landlord Three", category: "harassment", details: "Threatening messages about the deposit", status: "open", createdAt: "2026-11-09T01:00:00Z" };
const respond = (status: number, body: unknown) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }));
const row = (r: AdminReport) => renderToStaticMarkup(<ul><ReportRow report={r} onInspect={() => {}} onDecide={() => {}} /></ul>);

afterEach(() => vi.unstubAllGlobals());

describe("AdminReportsQueue", () => {
  it("renders status tabs with the initial tab pressed, and a loading skeleton", () => {
    const html = renderToStaticMarkup(<AdminReportsQueue userId="admin-a" initialStatus="resolved" />);
    for (const text of ["Open", "Resolved", "Dismissed", "All"]) expect(html).toContain(text);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Resolved/);
    expect(html).toContain("animate-pulse");
  });
  it("shows report summary and actions for open reports only", () => {
    const open = row(report);
    for (const text of ["Harassment", "Open", "Renter One", "Landlord Three", "Message report", "Threatening messages about the deposit", "Inspect evidence", "Resolve", "Dismiss"]) expect(open).toContain(text);
    const closed = row({ ...report, status: "resolved", resolutionNote: "Confirmed" });
    expect(closed).toContain("Inspect evidence");
    expect(closed).toContain("Resolution note: Confirmed");
    expect(closed).not.toContain(">Resolve<");
    expect(closed).not.toContain(">Dismiss<");
  });
  it("evidence view carries the audit notice and marks the reported message", () => {
    const html = renderToStaticMarkup(<EvidenceView report={{ ...report, evidenceSnapshot: { messages: [
      { id: "m1", senderId: "u1", body: "Hello", createdAt: "2026-11-09T00:59:00Z" },
      { id: "m2", senderId: "u3", body: "Pay me outside the app", createdAt: "2026-11-09T01:00:00Z", reported: true }] } }} />);
    for (const text of ["recorded in the admin audit log", "Hello", "Pay me outside the app", "Reported message", "Reporter ·", "Reported user ·"]) expect(html).toContain(text);
    expect(renderToStaticMarkup(<EvidenceView report={report} />)).toContain("No message evidence was captured");
  });
  it("inspects evidence through the audited GET with a fresh operation id", async () => {
    respond(200, { report: { ...report, evidenceSnapshot: { messages: [] } } });
    expect(await inspectReport("admin-a", "r1")).toMatchObject({ ok: true });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toMatch(/^\/api\/admin\/reports\/r1\?operationId=[0-9a-f-]{36}$/);
    expect((init as RequestInit).headers).toMatchObject({ "x-expected-user-id": "admin-a" });
  });
  it("posts the decision with trimmed note; enforcement flags only apply when resolving", async () => {
    respond(200, { report: {} });
    await submitReportDecision("admin-a", { report, decision: "resolved", operationId: "op-1" }, " Confirmed scam ", true, true);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ operationId: "op-1", decision: "resolved", resolutionNote: "Confirmed scam", suspendTargetUser: true, unpublishTargetListing: true });
    await submitReportDecision("admin-a", { report, decision: "dismissed", operationId: "op-2" }, "No violation", true, true);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string)).toMatchObject({ decision: "dismissed", suspendTargetUser: false, unpublishTargetListing: false });
    respond(409, { error: "This report changed." });
    expect(await submitReportDecision("admin-a", { report, decision: "resolved", operationId: "op-3" }, "Valid note", false, false)).toEqual({ ok: false, message: "This report changed." });
  });
});
