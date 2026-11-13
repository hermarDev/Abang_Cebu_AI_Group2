import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TicketRow, AdminSupportQueue } from "./AdminSupportQueue";
import type { SupportTicketRecord } from "@/lib/support/constants";

const sampleTicket: SupportTicketRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  ticketNumber: "SUP-01001",
  userId: "22222222-2222-4222-8222-222222222222",
  requesterName: "Mika Santos",
  requesterEmail: "mika@example.com",
  requesterRole: "renter",
  category: "account_access",
  subject: "Cannot update phone number",
  description: "Saving my phone number shows an error after verifying.",
  relatedListingId: null,
  attachments: [
    {
      storagePath: "11111111-1111-4111-8111-111111111111/screen.png",
      fileName: "screenshot.png",
      fileSize: 12000,
      mimeType: "image/png",
    },
  ],
  status: "open",
  priority: "high",
  adminResponse: "Looking into your account profile now.",
  assignedAdminId: "admin-1",
  assignedAdminName: "Ada Admin",
  resolvedAt: null,
  createdAt: "2026-11-13T01:00:00Z",
  updatedAt: "2026-11-13T01:05:00Z",
};

describe("AdminSupportQueue", () => {
  it("renders status filter tabs, search input, and category filter", () => {
    const html = renderToStaticMarkup(<AdminSupportQueue userId="admin-1" />);
    expect(html).toContain('aria-label="Support tickets"');
    expect(html).toContain('aria-label="Filter by status"');
    expect(html).toContain('aria-label="Search support tickets"');
    expect(html).toContain("Open");
    expect(html).toContain("In progress");
    expect(html).toContain("Resolved");
    expect(html).toContain("Closed");
  });

  it("renders ticket details, badges, attachments, and update button", () => {
    const html = renderToStaticMarkup(
      <ul>
        <TicketRow
          ticket={sampleTicket}
          highlighted={false}
          onManage={vi.fn()}
          onOpenAttachment={vi.fn()}
        />
      </ul>,
    );
    expect(html).toContain("SUP-01001");
    expect(html).toContain("Cannot update phone number");
    expect(html).toContain("Mika Santos");
    expect(html).toContain("screenshot.png");
    expect(html).toContain("Looking into your account profile now.");
    expect(html).toContain("Update ticket");
  });
});
