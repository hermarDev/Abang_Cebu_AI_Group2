import { renderToStaticMarkup } from "react-dom/server";
import { ClipboardCheck } from "lucide-react";
import { describe, expect, it } from "vitest";
import { DashboardStatCard } from "./DashboardStatCard";

describe("DashboardStatCard", () => {
  it("renders linked Admin-style stat card with tabular value, icon tone, and accessible affordances", () => {
    const html = renderToStaticMarkup(
      <DashboardStatCard
        href="/admin/reviews?status=pending"
        label="Pending reviews"
        value={7}
        icon={<ClipboardCheck size={20} aria-hidden="true" />}
        iconToneClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />,
    );

    expect(html).toContain('href="/admin/reviews?status=pending"');
    expect(html).toContain("Pending reviews");
    expect(html).toContain(">7<");
    expect(html).toContain("tabular-nums");
    expect(html).toContain("bg-amber-500/10 text-amber-600 dark:text-amber-400");
    expect(html).toContain("focus-visible:outline-ring");
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("undefined");
  });

  it("renders zero counts and optional description when supplied", () => {
    const html = renderToStaticMarkup(
      <DashboardStatCard
        href="/support-desk/tickets?status=open"
        label="Open complaints"
        value={0}
        description="Complaints needing initial triage or ongoing review"
        icon={<ClipboardCheck size={20} aria-hidden="true" />}
        iconToneClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />,
    );

    expect(html).toContain(">0<");
    expect(html).toContain("Open complaints");
    expect(html).toContain("Complaints needing initial triage or ongoing review");
  });

  it("renders an em-dash placeholder when value is null or omitted", () => {
    const nullHtml = renderToStaticMarkup(
      <DashboardStatCard
        href="/landlord/properties"
        label="Total properties"
        value={null}
        icon={<ClipboardCheck size={20} aria-hidden="true" />}
        iconToneClassName="bg-action/10 text-action"
      />,
    );
    const omittedHtml = renderToStaticMarkup(
      <DashboardStatCard
        href="/landlord/properties"
        label="Total properties"
        icon={<ClipboardCheck size={20} aria-hidden="true" />}
        iconToneClassName="bg-action/10 text-action"
      />,
    );

    expect(nullHtml).toContain(">—<");
    expect(nullHtml).not.toContain(">0<");
    expect(omittedHtml).toContain(">—<");
    expect(omittedHtml).not.toContain("undefined");
  });
});
