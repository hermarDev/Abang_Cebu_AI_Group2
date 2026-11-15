import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/AppToaster", () => ({ notify: vi.fn() }));
import { VerificationQueue, type VerificationQueueItem } from "./VerificationQueue";

const sampleItem: VerificationQueueItem = {
  id: "prop-1",
  title: "Apas Studio Apartment",
  description: "Cozy furnished studio",
  propertyType: "apartment",
  streetAddress: "123 Apas St",
  barangay: "Apas",
  city: "Cebu City",
  latitude: 10.33,
  longitude: 123.91,
  landlordId: "landlord-1",
  landlordName: "Juan Dela Cruz",
  landlordPhone: "+639****4567",
  submissionDraftId: "draft-1",
  submissionExpectedRevision: 1,
  submissionOperationId: "op-1",
  submissionCreatedAt: "2026-11-14T00:00:00Z",
  reviewStatus: "pending",
  fieldVerificationStatus: "pending_verification",
  fieldVerifiedBy: null,
  fieldVerifiedAt: null,
  fieldVerificationMethod: null,
  fieldVerificationNotes: null,
  fieldVerificationProof: [],
  fieldVerificationProxyName: null,
  fieldVerificationProxyRelationship: null,
};

const historicalVideoCallItem: VerificationQueueItem = {
  ...sampleItem,
  id: "prop-2",
  title: "Historical Video Call Property",
  fieldVerificationStatus: "verified",
  fieldVerificationMethod: "video_call",
  fieldVerificationNotes: "Video call inspection completed.",
  fieldVerificationProof: [{ kind: "photo", object_path: "old/path/photo.jpg" }],
  fieldVerifiedBy: "officer-1",
  fieldVerifiedAt: "2026-10-01T00:00:00Z",
};

const historicalProxyMeetingItem: VerificationQueueItem = {
  ...sampleItem,
  id: "prop-3",
  title: "Historical Proxy Meeting Property",
  fieldVerificationStatus: "flagged",
  fieldVerificationMethod: "proxy_meeting",
  fieldVerificationNotes: "Proxy meeting with caretaker.",
  fieldVerificationProof: [{ kind: "document", object_path: "old/path/doc.pdf" }],
  fieldVerificationProxyName: "Caretaker",
  fieldVerificationProxyRelationship: "Property manager",
  fieldVerifiedBy: "officer-1",
  fieldVerifiedAt: "2026-10-02T00:00:00Z",
};

describe("VerificationQueue", () => {
  it("renders queue header, search and filter options", () => {
    const html = renderToStaticMarkup(<VerificationQueue userId="officer-1" />);
    expect(html).toContain("Verification queue");
    // SSR renders the placeholder with ellipsis character (…)
    expect(html).toContain("Search title, address, or landlord");
    expect(html).toContain("Pending verification");
  });

  it("renders item cards with landlord contact details", () => {
    const html = renderToStaticMarkup(
      <VerificationQueue userId="officer-1" initialQueue={[sampleItem]} />
    );
    expect(html).toContain("Apas Studio Apartment");
    expect(html).toContain("Juan Dela Cruz");
    expect(html).toContain(sampleItem.landlordPhone!);
    expect(html).toContain("Verify submission");
    expect(html).toContain("Previous");
    expect(html).toContain("Next");
  });

  it("keeps pagination controls visible on empty pages after offset 0", () => {
    const htmlAtZero = renderToStaticMarkup(
      <VerificationQueue userId="officer-1" initialQueue={[]} initialOffset={0} />
    );
    expect(htmlAtZero).not.toContain("Previous");
    const htmlAtFifty = renderToStaticMarkup(
      <VerificationQueue userId="officer-1" initialQueue={[]} initialOffset={50} />
    );
    expect(htmlAtFifty).toContain("Previous");
    expect(htmlAtFifty).toContain("Next");
  });

  it("accepts initialStatus and initialSearch props", () => {
    const html = renderToStaticMarkup(
      <VerificationQueue
        userId="officer-1"
        initialQueue={[]}
        initialStatus="verified"
        initialSearch="test search"
      />
    );
    expect(html).toContain("Verified");
    expect(html).toContain("test search");
  });

  it("renders queue with initialStatus filter applied and highlights initialPropertyId card", () => {
    const html = renderToStaticMarkup(
      <VerificationQueue
        userId="officer-1"
        initialQueue={[sampleItem]}
        initialStatus="flagged"
        initialPropertyId="prop-1"
      />
    );
    expect(html).toContain("Flagged");
    expect(html).toContain("ring-action/25");
  });

  // --- NEW TESTS FOR TASK 4 & 5 (SSR-verifiable) ---

  it("displays historical video_call records accurately in queue list", () => {
    const html = renderToStaticMarkup(
      <VerificationQueue userId="officer-1" initialQueue={[historicalVideoCallItem]} />
    );
    expect(html).toContain("Historical Video Call Property");
    expect(html).toContain("Verified");
    // Historical method should display correctly in queue list
    expect(html).toContain("Video call");
  });

  it("displays historical proxy_meeting records with representative details in queue list", () => {
    const html = renderToStaticMarkup(
      <VerificationQueue userId="officer-1" initialQueue={[historicalProxyMeetingItem]} />
    );
    expect(html).toContain("Historical Proxy Meeting Property");
    expect(html).toContain("Flagged");
    expect(html).toContain("Caretaker");
    expect(html).toContain("Property manager");
  });

  it("does NOT render old method select options in SSR (Site visit is fixed)", () => {
    const html = renderToStaticMarkup(
      <VerificationQueue userId="officer-1" initialQueue={[sampleItem]} initialPropertyId="prop-1" />
    );
    // Should NOT contain the old method select options in SSR
    expect(html).not.toContain("Video call");
    expect(html).not.toContain("Proxy meeting");
    // Should not contain "Site Photo", "Document / ID", "Meeting Minutes" in SSR modal
    expect(html).not.toContain("Site Photo");
    expect(html).not.toContain("Document / ID");
    expect(html).not.toContain("Meeting Minutes");
  });

  it("renders queue action buttons", () => {
    const html = renderToStaticMarkup(
      <VerificationQueue userId="officer-1" initialQueue={[sampleItem]} initialPropertyId="prop-1" />
    );
    expect(html).toContain("Verify submission");
    // Modal not rendered in SSR, but queue button is present
  });
});