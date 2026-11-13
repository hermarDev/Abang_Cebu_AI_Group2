import { test, expect } from "./fixtures";

const LANDLORD_ID = "00000000-0000-0000-0000-00000000000a";

const notifications = [
  {
    id: "n-1",
    recipient_id: LANDLORD_ID,
    actor_id: "00000000-0000-0000-0000-00000000000b",
    type: "message",
    title: "New message",
    body: "Is the unit still available?",
    link: "/landlord/messages?thread=t-1",
    entity_type: "conversation",
    entity_id: "t-1",
    is_read: false,
    read_at: null,
    created_at: "2026-11-12T01:00:00Z",
  },
  {
    id: "n-2",
    recipient_id: LANDLORD_ID,
    actor_id: null,
    type: "listing_review",
    title: "Listing approved",
    body: "Your property is now live.",
    link: "/landlord/dashboard",
    entity_type: "property",
    entity_id: "p-1",
    is_read: true,
    read_at: "2026-11-12T02:00:00Z",
    created_at: "2026-11-12T02:00:00Z",
  },
];

async function seedAuthenticatedLandlord(page: import("@playwright/test").Page) {
  await page.route(url => url.pathname === "/auth/v1/token", route => route.fulfill({ json: {
    access_token: "fixture-token", token_type: "bearer", expires_in: 3600, refresh_token: "fixture-refresh",
    user: { id: LANDLORD_ID, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
  } }));
  await page.route(url => url.pathname === "/rest/v1/profiles", route => route.fulfill({ json: { role: "landlord", is_suspended: false } }));
}

test.describe("notifications hub", () => {
  test("bell links to the notifications hub with persistent actions, per-item dismiss, and badge", async ({ page }) => {
    await seedAuthenticatedLandlord(page);
    await page.route(url => url.pathname === "/api/notifications", route => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { notifications, totalCount: 2, unreadCount: 1, hasMore: false } });
      }
      return route.fulfill({ json: { success: true } });
    });

    await page.goto("/");
    const bell = page.getByRole("link", { name: /Notifications/ }).first();
    await expect(bell).toBeVisible();
    await expect(bell).toHaveAttribute("href", "/notifications");
    await bell.click();
    await page.waitForURL("**/notifications");

    // Hub header actions are reachable.
    await expect(page.getByRole("button", { name: /Mark all read/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Clear read/i })).toBeVisible();

    // Per-item dismiss is exposed with an accessible name.
    await expect(page.getByRole("button", { name: "Dismiss notification: New message" })).toHaveCount(1);
  });

  test("hub renders tabs, search, and bulk selection controls", async ({ page }) => {
    await seedAuthenticatedLandlord(page);
    await page.route(url => url.pathname === "/api/notifications", route => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: {
          notifications, totalCount: 2, unreadCount: 1, hasMore: false,
          tabCounts: { all: 2, unread: 1, messages: 1, listings: 1, system: 0 },
        } });
      }
      return route.fulfill({ json: { success: true } });
    });

    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: "Notifications", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Messages & Inquiries/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Listings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "System" })).toBeVisible();
    await expect(page.getByLabel("Search notifications")).toBeVisible();
    await expect(page.getByLabel("Select all visible notifications")).toBeVisible();
    await expect(page.getByText("New message")).toBeVisible();
    await expect(page.getByText("Listing approved")).toBeVisible();
  });

  test("clearing all requires confirmation", async ({ page }) => {
    await seedAuthenticatedLandlord(page);
    await page.route(url => url.pathname === "/api/notifications", route => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: {
          notifications, totalCount: 2, unreadCount: 1, hasMore: false,
          tabCounts: { all: 2, unread: 1, messages: 1, listings: 1, system: 0 },
        } });
      }
      return route.fulfill({ json: { success: true } });
    });

    await page.goto("/notifications");
    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page.getByText("Delete all?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Yes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("deleting a single notification issues a scoped DELETE request", async ({ page }) => {
    await seedAuthenticatedLandlord(page);
    const deletes: string[] = [];
    await page.route(url => url.pathname === "/api/notifications", route => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: {
          notifications, totalCount: 2, unreadCount: 1, hasMore: false,
          tabCounts: { all: 2, unread: 1, messages: 1, listings: 1, system: 0 },
        } });
      }
      if (route.request().method() === "DELETE") {
        deletes.push(route.request().url());
        return route.fulfill({ json: { success: true, deleted: "n-1" } });
      }
      return route.fulfill({ json: { success: true } });
    });

    await page.goto("/notifications");
    await page.getByRole("button", { name: "Dismiss notification: New message" }).click({ force: true });
    await expect.poll(() => deletes.length).toBeGreaterThan(0);
    expect(deletes[0]).toContain("id=n-1");
  });
});
