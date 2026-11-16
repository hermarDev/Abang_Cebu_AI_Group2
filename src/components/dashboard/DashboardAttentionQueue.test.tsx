import { renderToStaticMarkup } from "react-dom/server";
import { MapPin } from "lucide-react";
import { describe, expect, it } from "vitest";
import { DashboardAttentionQueue } from "./DashboardAttentionQueue";

describe("DashboardAttentionQueue", () => {
  it("renders Admin-style attention panel with header, action link, divider rows, and badges", () => {
    const html = renderToStaticMarkup(
      <DashboardAttentionQueue
        id="needs-inspection"
        title="Needs inspection"
        action={{ href: "/verification/queue?status=pending_verification", label: "View all" }}
        items={[
          {
            key: "p1",
            href: "/verification/queue?status=pending_verification&propertyId=p1",
            title: "Lahug Studio",
            subtitle: "Ana Cruz · 09171234567",
            icon: <MapPin size={18} aria-hidden="true" />,
            iconToneClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            badge: "Pending",
            badgeToneClassName: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
            trailingLabel: "Inspect",
          },
        ]}
      />,
    );

    expect(html).toContain('id="needs-inspection"');
    expect(html).toContain("rounded-2xl border border-border/90 bg-muted/20");
    expect(html).toContain("border-b border-border/70");
    expect(html).toContain("divide-y divide-border/60");
    expect(html).toContain("Needs inspection");
    expect(html).toContain('href="/verification/queue?status=pending_verification"');
    expect(html).toContain("View all");
    expect(html).toContain('href="/verification/queue?status=pending_verification&amp;propertyId=p1"');
    expect(html).toContain("Lahug Studio");
    expect(html).toContain("Ana Cruz · 09171234567");
    expect(html).toContain("Pending");
    expect(html).toContain("Inspect");
    expect(html).toContain("focus-visible:outline-ring");
  });

  it("renders an honest empty state when there are no attention items", () => {
    const html = renderToStaticMarkup(
      <DashboardAttentionQueue
        title="Needs attention"
        items={[]}
        emptyMessage="All submitted listings have been inspected."
      />,
    );

    expect(html).toContain("Needs attention");
    expect(html).toContain("All submitted listings have been inspected.");
    expect(html).not.toContain("divide-y");
  });
});
