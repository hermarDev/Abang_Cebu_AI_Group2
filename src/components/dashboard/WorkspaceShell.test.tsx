import { renderToStaticMarkup } from "react-dom/server";
import { LayoutDashboard, Settings } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  active: false,
  slots: [] as unknown[],
  index: 0,
}));

vi.mock("react", async (original) => {
  const actual = await original<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      if (!hooks.active) return actual.useState(initial);
      const index = hooks.index++;
      if (!(index in hooks.slots)) {
        hooks.slots[index] = typeof initial === "function" ? (initial as () => unknown)() : initial;
      }
      return [
        hooks.slots[index],
        (value: unknown) => {
          hooks.slots[index] =
            typeof value === "function"
              ? (value as (prev: unknown) => unknown)(hooks.slots[index])
              : value;
        },
      ];
    },
  };
});

vi.mock("@/features/map/useFinderTheme", () => ({
  useFinderTheme: () => ({ preference: "system", resolvedTheme: "light", setPreference: vi.fn() }),
}));

import { WorkspaceMobileNav, WorkspaceShell, type WorkspaceNavGroup } from "./WorkspaceShell";

afterEach(() => {
  hooks.active = false;
  hooks.slots = [];
  hooks.index = 0;
});

function collectElements(node: unknown): Array<import("react").ReactElement<Record<string, unknown>>> {
  if (Array.isArray(node)) return node.flatMap(collectElements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const el = node as import("react").ReactElement<Record<string, unknown>>;
  return [el, ...collectElements(el.props.children)];
}

const navGroups: WorkspaceNavGroup[] = [
  {
    label: "Workspace",
    links: [
      { href: "/admin/dashboard", label: "Overview", Icon: LayoutDashboard },
      { href: "/account", label: "Account settings", Icon: Settings, badge: 3, badgeVariant: "muted" },
    ],
  },
];

describe("WorkspaceShell", () => {
  it("renders fixed header, collapsible desktop sidebar, page header, body, and mobile nav slot with single safe-area bottom clearance", () => {
    const html = renderToStaticMarkup(
      <WorkspaceShell
        pathname="/admin/dashboard"
        brand={<span>Brand</span>}
        headerActions={<span>HeaderActions</span>}
        asideAriaLabel="Admin navigation"
        sidebarTitle="Admin tools"
        navAriaLabel="Admin workspace"
        navGroups={navGroups}
        title="Overview"
        subtitle="Summary"
        pageActions={<button type="button">Create</button>}
        mobileNav={<nav aria-label="Mobile slot">Mobile</nav>}
      >
        <p>Main Body</p>
      </WorkspaceShell>
    );

    expect(html).toContain("Brand");
    expect(html).toContain("HeaderActions");
    expect(html).toContain('aria-label="Admin navigation"');
    expect(html).toContain("Admin tools");
    expect(html).toContain('aria-label="Admin workspace"');
    expect(html).toContain('aria-label="Overview" aria-current="page"');
    expect(html).toContain(">3</span>");
    expect(html).toContain("Overview</h1>");
    expect(html).toContain("Summary</p>");
    expect(html).toContain("Create</button>");
    expect(html).toContain("<p>Main Body</p>");
    expect(html).toContain('aria-label="Mobile slot"');
    expect(html.match(/pb-\[calc\(5rem\+env\(safe-area-inset-bottom\)\)\]/g)).toHaveLength(1);
  });

  it("toggles desktop sidebar expanded/collapsed state", () => {
    hooks.active = true;
    const renderTree = () => {
      hooks.index = 0;
      return WorkspaceShell({
        pathname: "/admin/dashboard",
        brand: <span>Brand</span>,
        asideAriaLabel: "Admin navigation",
        sidebarTitle: "Admin tools",
        navAriaLabel: "Admin workspace",
        navGroups,
        children: <p>Body</p>,
      });
    };

    let tree = collectElements(renderTree());
    const collapseBtn = tree.find((el) => el.type === "button" && el.props["aria-label"] === "Collapse sidebar");
    expect(collapseBtn).toBeDefined();
    expect(collapseBtn?.props["aria-expanded"]).toBe(true);

    (collapseBtn?.props.onClick as () => void)();
    tree = collectElements(renderTree());
    const expandBtn = tree.find((el) => el.type === "button" && el.props["aria-label"] === "Expand sidebar");
    expect(expandBtn).toBeDefined();
    expect(expandBtn?.props["aria-expanded"]).toBe(false);
  });

  it("renders WorkspaceMobileNav with 44px touch targets and opens More modal with extra links", () => {
    const html = renderToStaticMarkup(
      <WorkspaceMobileNav
        pathname="/admin/reviews"
        navAriaLabel="Admin mobile navigation"
        moreAriaLabel="More admin options"
        links={[
          { href: "/admin/dashboard", label: "Overview", Icon: LayoutDashboard },
          { href: "/admin/reviews", label: "Reviews", Icon: Settings },
        ]}
        extraModalLinks={[{ href: "/admin/audit", label: "Audit log", Icon: Settings }]}
      />
    );

    expect(html).toContain('aria-label="Admin mobile navigation"');
    expect(html).toContain('aria-label="Reviews" aria-current="page"');
    expect(html).toContain("min-h-11 min-w-11");
    expect(html).toContain('aria-label="More admin options"');

    hooks.active = true;
    const renderNav = () => {
      hooks.index = 0;
      return WorkspaceMobileNav({
        pathname: "/admin/reviews",
        navAriaLabel: "Admin mobile navigation",
        moreAriaLabel: "More admin options",
        links: [
          { href: "/admin/dashboard", label: "Overview", Icon: LayoutDashboard },
          { href: "/admin/reviews", label: "Reviews", Icon: Settings },
        ],
        extraModalLinks: [{ href: "/admin/audit", label: "Audit log", Icon: Settings }],
      });
    };

    let tree = collectElements(renderNav());
    const moreBtn = tree.find((el) => el.type === "button" && el.props["aria-label"] === "More admin options");
    expect(moreBtn?.props["aria-expanded"]).toBe(false);
    (moreBtn?.props.onClick as () => void)();

    tree = collectElements(renderNav());
    const openedBtn = tree.find((el) => el.type === "button" && el.props["aria-label"] === "More admin options");
    expect(openedBtn?.props["aria-expanded"]).toBe(true);
    const modal = tree.find((el) => el.props.title === "More admin options");
    expect(modal?.props.open).toBe(true);
    const modalText = JSON.stringify(collectElements(modal?.props.children).map((el) => el.props));
    expect(modalText).toContain("Audit log");
    expect(modalText).toContain("Help Center");
    expect(modalText).toContain("Account settings");
  });
});
