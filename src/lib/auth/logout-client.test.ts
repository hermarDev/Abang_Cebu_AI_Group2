import { beforeEach, describe, expect, it, vi } from "vitest";
import { logoutFromCurrentTab } from "./logout-client";

const fetcher = vi.fn();
const announce = vi.fn();

beforeEach(() => {
  fetcher.mockReset();
  announce.mockReset();
});

describe("logoutFromCurrentTab", () => {
  it("posts to the logout API and announces only after successful revocation", async () => {
    fetcher.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    await expect(logoutFromCurrentTab(fetcher, announce)).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledWith("/api/logout", { method: "POST" });
    expect(announce).toHaveBeenCalledWith({
      type: "SIGNED_OUT",
      redirectUrl: "/login?message=logged_out",
    });
  });

  it("does not announce logout when the API reports failure", async () => {
    fetcher.mockResolvedValue({ ok: false, json: async () => ({ success: false }) });

    await expect(logoutFromCurrentTab(fetcher, announce)).resolves.toBe(false);
    expect(announce).not.toHaveBeenCalled();
  });

  it("does not announce malformed success responses", async () => {
    fetcher.mockResolvedValue({ ok: true, json: async () => ({ success: false }) });

    await expect(logoutFromCurrentTab(fetcher, announce)).resolves.toBe(false);
    expect(announce).not.toHaveBeenCalled();
  });

  it("lets network errors reach the UI for retry", async () => {
    fetcher.mockRejectedValue(new Error("offline"));

    await expect(logoutFromCurrentTab(fetcher, announce)).rejects.toThrow("offline");
    expect(announce).not.toHaveBeenCalled();
  });
});
