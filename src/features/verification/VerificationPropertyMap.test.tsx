import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VerificationMapList, VerificationPropertyMap } from "./VerificationPropertyMap";
import type { VerificationQueueItem } from "./VerificationQueue";

const { getUserMock, fromMock, redirectMock, notFoundMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  redirectMock: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }),
  notFoundMock: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock, notFound: notFoundMock, usePathname: () => "/verification/map" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: getUserMock }, from: fromMock }) }));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: async () => null }));
vi.mock("@/features/notifications/NotificationBell", () => ({ NotificationBell: () => null }));
vi.mock("@/components/ui/AccountMenu", () => ({ AccountMenu: () => null }));
vi.mock("@/features/map/AppearanceControls", () => ({ AppearanceControls: () => null }));
vi.mock("@/features/map/useFinderTheme", () => ({ useFinderTheme: () => ({ preference: "system", resolvedTheme: "light", setPreference: () => {} }) }));

import VerificationMapPage from "@/app/verification/map/page";

describe("verification map page access", () => {
  it("redirects guests and denies non-verifiers or suspended staff, while allowing active verifiers", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(VerificationMapPage()).rejects.toThrow("NEXT_REDIRECT");

    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });
    fromMock.mockReturnValueOnce({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "landlord", is_suspended: false }, error: null }) }) }) });
    await expect(VerificationMapPage()).rejects.toThrow("NEXT_NOT_FOUND");

    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u2" } }, error: null });
    fromMock.mockReturnValueOnce({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "verification_officer", is_suspended: true }, error: null }) }) }) });
    await expect(VerificationMapPage()).rejects.toThrow("NEXT_NOT_FOUND");

    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u3" } }, error: null });
    fromMock.mockReturnValueOnce({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "verification_officer", is_suspended: false, full_name: "Verifier", avatar_url: null }, error: null }) }) }) });
    const html = renderToStaticMarkup(await VerificationMapPage());
    expect(html).toContain("Verification map");
  });
});

describe("verification map list", () => {
  it("provides a collapsible list control", () => {
    const html = renderToStaticMarkup(<VerificationPropertyMap userId="user" />);
    expect(html).toMatch(/<summary[^>]*>.*Pending properties/);
  });
  it("offers a refresh action for a queue that can change", () => {
    const html = renderToStaticMarkup(<VerificationPropertyMap userId="user" />);
    expect(html).toContain("Refresh properties");
  });
  it("keeps an unmappable property accessible with its queue link", () => {
    const item: VerificationQueueItem = { id: "abc", title: "Property", latitude: null, longitude: null, submissionDraftId: "draft", submissionExpectedRevision: 1, submissionOperationId: "op", submissionCreatedAt: "date", reviewStatus: "pending", fieldVerificationStatus: "pending_verification" };
    const html = renderToStaticMarkup(<VerificationMapList items={[item]} selectedId={null} onSelect={() => {}} />);
    expect(html).toContain("Property");
    expect(html).toContain("Location unavailable");
    expect(html).toContain("propertyId=abc");
  });
});
