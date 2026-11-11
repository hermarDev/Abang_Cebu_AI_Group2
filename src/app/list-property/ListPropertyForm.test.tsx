import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  cursor: 0,
  values: [] as unknown[],
  refCursor: 0,
  refs: [] as Array<{ current: unknown }>,
  push: vi.fn(),
  save: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useState: (initial: unknown) => {
      const index = hooks.cursor++;
      if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? (initial as () => unknown)() : initial;
      const set = (value: unknown) => {
        hooks.values[index] = typeof value === "function" ? (value as (current: unknown) => unknown)(hooks.values[index]) : value;
      };
      return [hooks.values[index], set];
    },
    useEffect: () => {},
    useRef: (initial: unknown) => {
      const index = hooks.refCursor++;
      hooks.refs[index] ??= { current: initial };
      return hooks.refs[index];
    },
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: hooks.push }) }));
vi.mock("@/components/ui/AppToaster", () => ({ notify: vi.fn() }));
vi.mock("@/features/map/useFinderTheme", () => ({ useFinderTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/components/map/MapSearch", () => ({ default: () => null }));
vi.mock("@/components/map/MapCanvasLoader", () => ({ default: () => null }));
vi.mock("./draft-retry-store", () => ({ BrowserDraftIntentRepository: class { async listPending() { return []; } } }));
vi.mock("./draft-save-client", () => ({ executeDraftSave: hooks.save }));

import { notify } from "@/components/ui/AppToaster";
import { ListPropertyForm } from "./ListPropertyForm";

type Element = ReactElement<Record<string, unknown>>;
const fields: Record<string, string> = {};
let formProps: Partial<React.ComponentProps<typeof ListPropertyForm>> = {};

// Minimal stand-in for the <form> DOM node: every step panel is valid and fields read from `fields`.
const fakeForm = {
  scrollIntoView: () => {},
  elements: { namedItem: () => null },
  querySelectorAll: () => [],
  querySelector: (selector: string) => {
    if (selector.startsWith("[data-step-panel")) return { querySelector: () => null };
    const name = /\[name="(\w+)"\]/.exec(selector)?.[1];
    return name ? { value: fields[name] ?? "" } : null;
  },
};

function walk(node: ReactNode, visit: (element: Element) => void) {
  if (Array.isArray(node)) { node.forEach((child) => walk(child, visit)); return; }
  if (!isValidElement<Record<string, unknown>>(node)) return;
  visit(node);
  walk(node.props.children as ReactNode, visit);
}
function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  return isValidElement<Record<string, unknown>>(node) ? text(node.props.children as ReactNode) : "";
}
function render() {
  hooks.cursor = 0;
  hooks.refCursor = 0;
  const tree = ListPropertyForm({ userId: "landlord-a", ...formProps });
  walk(tree, (el) => { if (el.type === "form") (el.props.ref as { current: unknown }).current = fakeForm; });
  return tree;
}
function find(match: (el: Element) => boolean) {
  let found: Element | undefined;
  walk(render(), (el) => { if (!found && match(el)) found = el; });
  if (!found) throw new Error("element not found");
  return found;
}
const button = (label: string) => find((el) => el.type === "button" && text(el.props.children as ReactNode).trim() === label);
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise<void>((resolve) => setImmediate(resolve)); };

async function reachReviewStep() {
  (find((el) => el.props.name === "permitNotRequiredConfirmed").props.onChange as (event: unknown) => void)({ target: { checked: true } });
  // Pick a map location (reverse lookup fails in the stub, which keeps the pin).
  await (find((el) => typeof el.props.onSelect === "function").props.onSelect as (place: unknown) => Promise<void>)({ id: "p", name: "Pin", detail: "", coordinates: [123.9, 10.3] });
  await settle();
  for (let i = 0; i < 4; i++) (find((el) => el.type === "button" && text(el.props.children as ReactNode).startsWith("Continue")).props.onClick as () => void)();
  expect(text(render())).toContain("Step 5 of 5");
}

let submissions: Array<{ operationId: string; draftId: string; expectedRevision: number }>;
let submitReplies: Array<{ status: number; body: unknown }>;

beforeEach(() => {
  formProps = {};
  hooks.values = [];
  hooks.refs = [];
  hooks.push.mockReset();
  hooks.save.mockReset();
  vi.mocked(notify).mockReset();
  Object.assign(fields, { title: "Lahug studio", description: "A quiet studio near the university campus.", propertyType: "apartment", rentalType: "private_room", price: "12000", barangay: "Lahug", city: "Cebu City" });
  submissions = [];
  submitReplies = [];
  // node test env: the form's instanceof checks only need the constructors to exist.
  for (const name of ["HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement"]) vi.stubGlobal(name, class {});
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/landlord/properties") {
      submissions.push(JSON.parse(String(init?.body)));
      const reply = submitReplies.shift() ?? { status: 200, body: { propertyId: "prop-1", status: "pending" } };
      return { ok: reply.status < 400, status: reply.status, json: async () => reply.body };
    }
    if (url === "/api/property-drafts") return { ok: true, json: async () => ({ drafts: [] }) };
    return { ok: false, status: 503, json: async () => ({}) };
  }));
});

describe("ListPropertyForm", () => {
  it("renders the first step fields and step navigation", () => {
    const names: unknown[] = [];
    walk(render(), (el) => { if (el.props.name) names.push(el.props.name); });
    expect(names).toEqual(expect.arrayContaining(["title", "description", "propertyType", "rentalType", "price", "tenantPolicy"]));
    expect(text(render())).toContain("Step 1 of 5");
    expect(find((el) => el.props["aria-label"] === "Step 1: Property details").props["aria-current"]).toBe("step");
    expect(button("Save draft")).toBeTruthy();
  });

  it("shows completed-step checkmarks, section Edit buttons and the pending review callout", async () => {
    await reachReviewStep();
    const tree = render();
    expect(find((el) => el.props["aria-label"] === "Edit property details")).toBeTruthy();
    for (const label of ["Edit location", "Edit amenities and photos", "Edit business permit"]) expect(find((el) => el.props["aria-label"] === label)).toBeTruthy();
    expect(text(tree)).toContain("What happens next:");
    expect(text(tree)).toContain("pending review");
    let checks = 0;
    walk(tree, (el) => { if (el.props["aria-label"]?.toString().startsWith("Step ")) walk(el.props.children as ReactNode, (c) => { if (c.props.size === 13) checks++; }); });
    expect(checks).toBe(4);
    (find((el) => el.props["aria-label"] === "Edit location").props.onClick as () => void)();
    expect(text(render())).toContain("Step 2 of 5");
  });

  it("renders the interactive drag-and-drop photo dropzone with accessible label", () => {
    const dropzone = find((el) => el.props["aria-label"] === "Drag and drop photo upload area");
    expect(dropzone).toBeTruthy();
    expect(typeof dropzone.props.onDragOver).toBe("function");
    expect(typeof dropzone.props.onDrop).toBe("function");
    const input = find((el) => el.props.name === "propertyPhotos");
    expect(input.props.accept).toBe("image/jpeg,image/png,image/webp");
  });

  it("auto-saves unsaved edits and submits the new revision in one click", async () => {
    hooks.save.mockResolvedValueOnce({ draftId: "draft-1", revision: 2 }).mockResolvedValueOnce({ draftId: "draft-1", revision: 3 });
    await reachReviewStep();
    (button("Save draft").props.onClick as () => void)();
    await settle();
    expect(notify).toHaveBeenCalledWith("success", "property-draft-save", "Draft saved.");

    fields.title = "Newer listing title";
    (button("Submit listing for review").props.onClick as () => void)();
    await settle();

    expect(hooks.save).toHaveBeenCalledTimes(2);
    expect(hooks.save.mock.calls[1][0]).toMatchObject({ draftId: "draft-1", revision: 2, values: { title: "Newer listing title" } });
    expect(submissions).toEqual([expect.objectContaining({ draftId: "draft-1", expectedRevision: 3 })]);
    expect(notify).toHaveBeenCalledWith("success", "property-submission", "Listing submitted for review. Status: pending.");
    expect(hooks.push).toHaveBeenCalledWith("/landlord/map?selected=prop-1");
  });

  it("retries a 503 submission without re-saving and with the same operation ID", async () => {
    hooks.save.mockResolvedValueOnce({ draftId: "draft-1", revision: 2 });
    submitReplies.push({ status: 503, body: { error: "Temporary network failure" } });
    await reachReviewStep();

    (button("Submit listing for review").props.onClick as () => void)();
    await settle();
    expect(notify).toHaveBeenCalledWith("error", "property-submission", "Submission could not be confirmed. Your draft was kept; retry when ready.");
    expect(hooks.push).not.toHaveBeenCalled();

    (button("Submit listing for review").props.onClick as () => void)();
    await settle();
    expect(hooks.save).toHaveBeenCalledTimes(1);
    expect(submissions).toHaveLength(2);
    expect(submissions[1].operationId).toBe(submissions[0].operationId);
    expect(submissions[1]).toMatchObject({ draftId: "draft-1", expectedRevision: 2 });
    expect(hooks.push).toHaveBeenCalledWith("/landlord/map?selected=prop-1");
  });

  it("handles HTTP 409 already submitted gracefully with a toast and redirects to /landlord/properties", async () => {
    hooks.save.mockResolvedValueOnce({ draftId: "draft-1", revision: 2 });
    submitReplies.push({ status: 409, body: { error: "This draft revision was already submitted.", code: "already_submitted" } });
    await reachReviewStep();

    (button("Submit listing for review").props.onClick as () => void)();
    await settle();

    expect(notify).toHaveBeenCalledWith("success", "property-submission", "Submission already received");
    expect(hooks.push).toHaveBeenCalledWith("/landlord/properties");
    expect(button("Saving…")).toBeTruthy();
  });

  it("handles HTTP 409 draft conflict by remaining on form without redirecting", async () => {
    hooks.save.mockResolvedValueOnce({ draftId: "draft-1", revision: 2 });
    submitReplies.push({ status: 409, body: { error: "This draft changed or was already submitted. Reload the draft before submitting.", code: "draft_conflict" } });
    await reachReviewStep();

    (button("Submit listing for review").props.onClick as () => void)();
    await settle();

    expect(notify).toHaveBeenCalledWith("error", "property-submission", "This draft changed or was already submitted. Reload the draft before submitting.");
    expect(hooks.push).not.toHaveBeenCalled();
  });

  it("redirects revisions to /landlord/properties on successful submission and keeps saving=true", async () => {
    formProps = { restoreTarget: { draftId: "draft-rev-1", revision: "2" } };
    hooks.save.mockResolvedValueOnce({ draftId: "draft-rev-1", revision: 2 });
    submitReplies.push({ status: 200, body: { propertyId: "prop-rev-1", status: "pending" } });
    await reachReviewStep();

    (button("Submit listing for review").props.onClick as () => void)();
    await settle();

    expect(notify).toHaveBeenCalledWith("success", "property-submission", "Listing submitted for review. Status: pending.");
    expect(hooks.push).toHaveBeenCalledWith("/landlord/properties");
    expect(button("Saving…")).toBeTruthy();
  });
});
