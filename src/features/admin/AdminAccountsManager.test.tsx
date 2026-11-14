import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/AppToaster", () => ({ notify: vi.fn() }));
import { AccountRow, AdminAccountsManager, CreateStaffAccountForm, submitAccountChange, type AdminAccount } from "./AdminAccountsManager";

const landlord: AdminAccount = { id: "u1", fullName: "Lana Lord", role: "landlord", isSuspended: false, propertyCount: 4, livePropertyCount: 2, openReportCount: 1 };
const respond = (status: number, body: unknown) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }));

afterEach(() => vi.unstubAllGlobals());

describe("AdminAccountsManager", () => {
  it("renders filters, search and a loading skeleton", () => {
    const html = renderToStaticMarkup(<AdminAccountsManager userId="admin-a" initialStatus="suspended" />);
    expect(html).toContain('placeholder="Search account name…"');
    expect(html).toContain("Suspended");
    expect(html).toContain("animate-pulse");
  });
  it("shows counts and the right action per account", () => {
    const row = (account: AdminAccount) => renderToStaticMarkup(<ul><AccountRow account={account} onAction={() => {}} /></ul>);
    const active = row(landlord);
    for (const text of ["Lana Lord", "Landlord", "Active", "4 properties (2 live)", "1 open reports", "Suspend account"]) expect(active).toContain(text);
    expect(row({ ...landlord, isSuspended: true })).toContain("Reinstate account");
    const admin = row({ ...landlord, role: "admin" });
    expect(admin).toContain("Protected admin");
    expect(admin).not.toContain("Suspend account");
  });
  it("posts the suspension with reason and listing-unpublish choice", async () => {
    respond(200, { account: {} });
    const result = await submitAccountChange("admin-a", { account: landlord, suspend: true, operationId: "op-1" }, " Repeated abuse ", true);
    expect(result).toMatchObject({ ok: true, account: { isSuspended: true } });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/admin/accounts");
    expect((init as RequestInit).headers).toMatchObject({ "x-expected-user-id": "admin-a" });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ targetUserId: "u1", operationId: "op-1", suspend: true, reason: "Repeated abuse", unpublishListings: true });
  });
  it("never asks to unpublish on reinstate, and reports failures", async () => {
    respond(200, {});
    await submitAccountChange("admin-a", { account: { ...landlord, isSuspended: true }, suspend: false, operationId: "op-2" }, "Appeal accepted", true);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toMatchObject({ suspend: false, unpublishListings: false });
    respond(503, { error: "The account change could not be confirmed." });
    expect(await submitAccountChange("admin-a", { account: landlord, suspend: true, operationId: "op-3" }, "Valid reason", true)).toEqual({ ok: false, message: "The account change could not be confirmed." });
  });
  it("renders inspect account button when onInspect is provided", () => {
    const html = renderToStaticMarkup(
      AccountRow({
        account: { id: "a1", role: "landlord", isSuspended: false, fullName: "Lana Lord", propertyCount: 2, livePropertyCount: 1, openReportCount: 0 },
        onAction: () => {},
        onInspect: () => {},
      })
    );
    expect(html).toContain("Inspect account");
  });

  it("renders Create Staff Account button", () => {
    const html = renderToStaticMarkup(<AdminAccountsManager userId="admin-a" />);
    expect(html).toContain("Create Staff Account");
  });

  it("renders staff creation form with neutral placeholders and 44px password toggle", () => {
    const baseProps = {
      role: "verification_officer",
      onRoleChange: () => {},
      fullName: "",
      onFullNameChange: () => {},
      email: "",
      onEmailChange: () => {},
      password: "",
      onPasswordChange: () => {},
      showPassword: false,
      onToggleShowPassword: () => {},
      saving: false,
      error: null,
      onCancel: () => {},
      onSubmit: () => {},
    };
    const hiddenHtml = renderToStaticMarkup(<CreateStaffAccountForm {...baseProps} />);
    expect(hiddenHtml).toContain('placeholder="Enter full name"');
    expect(hiddenHtml).toContain('placeholder="Enter email address"');
    expect(hiddenHtml).toContain('placeholder="Enter secure password"');
    expect(hiddenHtml).not.toContain("Maria Santos");
    expect(hiddenHtml).not.toContain("maria.santos");
    expect(hiddenHtml).toContain('type="password"');
    expect(hiddenHtml).toContain('aria-label="Show password"');
    expect(hiddenHtml).toContain("size-11");
    expect(hiddenHtml).toContain("pr-12");
    expect(hiddenHtml).toContain("Password requirements");
    expect(hiddenHtml).toContain('aria-describedby="staff-password-requirements"');
    expect(hiddenHtml).toContain("The password must be at least 8 characters.");
    expect(hiddenHtml).toContain("The password must contain at least one uppercase and one lowercase letter.");
    expect(hiddenHtml).toContain("The password must contain at least one symbol.");
    expect(hiddenHtml).toContain("The password must contain at least one number.");

    const weakHtml = renderToStaticMarkup(
      <CreateStaffAccountForm
        {...baseProps}
        fullName="Staff User"
        email="staff@abangcebu.ph"
        password="weakpassword"
      />
    );
    expect(weakHtml).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);

    const revealedHtml = renderToStaticMarkup(
      <CreateStaffAccountForm
        {...baseProps}
        fullName="Staff User"
        email="staff@abangcebu.ph"
        password="Password123!"
        showPassword
        error="Email already registered."
      />
    );
    expect(revealedHtml).toContain('type="text"');
    expect(revealedHtml).toContain('aria-label="Hide password"');
    expect(revealedHtml).toContain('role="alert"');
    expect(revealedHtml).toContain("Email already registered.");
    expect(revealedHtml).not.toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
    expect(revealedHtml).toContain("overflow-y-auto overscroll-contain");
    expect(revealedHtml).toContain("shrink-0 flex-wrap justify-end gap-2 border-t border-border");
  });

  it("renders responsive mobile-first toolbar layout without squishing search or card actions", () => {
    const html = renderToStaticMarkup(<AdminAccountsManager userId="admin-a" />);
    expect(html).toContain("flex-col gap-3 lg:flex-row");
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("w-full shrink-0 gap-1.5 sm:w-auto");

    const rowHtml = renderToStaticMarkup(
      <ul>
        <AccountRow account={landlord} onAction={() => {}} onInspect={() => {}} />
      </ul>
    );
    expect(rowHtml).toContain("flex-1 sm:flex-initial");
  });
});
