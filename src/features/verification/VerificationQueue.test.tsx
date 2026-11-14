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
  landlordPhone: "+639171234567",
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

describe("VerificationQueue", () => {
  it("renders queue header, search and filter options", () => {
    const html = renderToStaticMarkup(<VerificationQueue userId="officer-1" />);
    expect(html).toContain("Verification queue");
    expect(html).toContain("Search title, address, or landlord…");
    expect(html).toContain("Pending verification");
  });

  it("renders item cards with landlord contact details", () => {
    const html = renderToStaticMarkup(
      <VerificationQueue userId="officer-1" initialQueue={[sampleItem]} />
    );
    expect(html).toContain("Apas Studio Apartment");
    expect(html).toContain("Juan Dela Cruz");
    expect(html).toContain("+639171234567");
    expect(html).toContain("Verify submission");
  });
});
