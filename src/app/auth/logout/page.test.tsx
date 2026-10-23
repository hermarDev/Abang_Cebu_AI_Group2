import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import LogoutPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth/logout-client", () => ({
  logoutFromCurrentTab: vi.fn(),
}));

describe("LogoutPage", () => {
  it("renders a confirmation screen instead of redirecting GET to a POST-only API", () => {
    const html = renderToStaticMarkup(<LogoutPage />);

    expect(html).toContain("Sign out of AbangCebu?");
    expect(html).toContain("Cancel");
    expect(html).toContain("Sign out");
    expect(html).not.toContain("LogoutSyncListener");
  });
});
