"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Eye, EyeOff, ShieldAlert, UserPlus } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { notify } from "@/components/ui/AppToaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { validatePasswordStrength } from "@/types/auth";
import { AdminReasonField } from "./AdminReasonField";
import { adminCall, newOperationId, reasonProblem } from "./admin-api";
import { statusBadgeVariant } from "./status-badge";
export type AdminAccount = {
  id: string;
  fullName?: string | null;
  role: string;
  isSuspended: boolean;
  propertyCount?: number;
  livePropertyCount?: number;
  openReportCount?: number;
};
type Dialog = { account: AdminAccount; suspend: boolean; operationId: string };

const roleOptions = [
  { value: "", label: "All roles" },
  { value: "renter", label: "Renter" },
  { value: "landlord", label: "Landlord" },
  { value: "admin", label: "Admin" },
  { value: "verification_officer", label: "Field Verification Officer" },
  { value: "customer_support", label: "Customer Support" },
];
const statusOptions = [{ value: "", label: "All statuses" }, { value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }];
const cap = (value: string) => {
  if (value === "verification_officer") return "Field Verification Officer";
  if (value === "customer_support") return "Customer Support";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export async function submitAccountChange(userId: string, { account, suspend, operationId }: Dialog, reason: string, unpublishListings: boolean) {
  const result = await adminCall<unknown>("/api/admin/accounts", userId, { targetUserId: account.id, operationId, suspend, reason: reason.trim(), unpublishListings: suspend && unpublishListings });
  return result.ok ? { ok: true as const, account: { ...account, isSuspended: suspend } } : result;
}

export function AccountRow({ account, onAction, onInspect }: { account: AdminAccount; onAction: (account: AdminAccount) => void; onInspect?: (account: AdminAccount) => void }) {
  const initials = (account.fullName?.trim() || "U").slice(0, 2).toUpperCase();
  return <li className="grid gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-action/30 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-action/10 text-xs font-bold text-action">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 break-words font-semibold text-foreground">{account.fullName?.trim() || "Unnamed account"}</p>
        <div className="m-0 mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Badge variant="outline">{cap(account.role)}</Badge>
          <Badge variant={statusBadgeVariant(account.isSuspended ? "suspended" : "active")}>{account.isSuspended ? "Suspended" : "Active"}</Badge>
          <span>{account.propertyCount ?? 0} properties ({account.livePropertyCount ?? 0} live)</span>
          <span>{account.openReportCount ?? 0} open reports</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 pt-2 border-t border-border/60 sm:border-t-0 sm:pt-0 sm:shrink-0">
      {onInspect && (
        <Button size="sm" variant="outline" onClick={() => onInspect(account)} aria-label={`Inspect account ${account.fullName || account.id}`}>
          Inspect account
        </Button>
      )}
      {account.role === "admin" ? (
        <span className="text-sm font-medium text-muted-foreground px-2">Protected admin</span>
      ) : (
        <Button size="sm" variant={account.isSuspended ? "outline" : "destructive"} onClick={() => onAction(account)}>
          {account.isSuspended ? "Reinstate account" : "Suspend account"}
        </Button>
      )}
    </div>
  </li>;
}

const known = (options: { value: string }[], value?: string) => (options.some((o) => o.value === value) ? value! : "");

const sortOptions = [
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "properties_desc", label: "Most properties" },
  { value: "reports_desc", label: "Most reports" },
];

export type CreateStaffAccountFormProps = {
  role: string;
  onRoleChange: (value: string) => void;
  fullName: string;
  onFullNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: () => void;
};

export function CreateStaffAccountForm({
  role,
  onRoleChange,
  fullName,
  onFullNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPassword,
  onToggleShowPassword,
  saving,
  error,
  onCancel,
  onSubmit,
}: CreateStaffAccountFormProps) {
  const [passwordTouched, setPasswordTouched] = useState(false);
  const strength = validatePasswordStrength(password);
  const invalid = !fullName.trim() || !email.trim() || !strength.isValid;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid gap-4"
    >
      <div className="grid gap-1.5">
        <label htmlFor="staff-role" className="text-sm font-medium text-foreground">
          Staff role
        </label>
        <Select
          id="staff-role"
          aria-label="Staff role"
          options={[
            { value: "verification_officer", label: "Field Verification Officer" },
            { value: "customer_support", label: "Customer Support" },
          ]}
          value={role}
          onValueChange={onRoleChange}
          disabled={saving}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="staff-fullname" className="text-sm font-medium text-foreground">
          Full name
        </label>
        <Input
          id="staff-fullname"
          aria-label="Full name"
          placeholder="Enter full name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          disabled={saving}
          required
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="staff-email" className="text-sm font-medium text-foreground">
          Email address
        </label>
        <Input
          id="staff-email"
          type="email"
          aria-label="Email address"
          placeholder="Enter email address"
          autoComplete="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={saving}
          required
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="staff-password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <div
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setPasswordTouched(true);
            }
          }}
        >
          <Input
            id="staff-password"
            type={showPassword ? "text" : "password"}
            aria-label="Password"
            placeholder="Enter secure password"
            autoComplete="new-password"
            maxLength={72}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            disabled={saving}
            aria-invalid={passwordTouched && !strength.isValid}
            aria-describedby="staff-password-requirements"
            className="pr-12"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={onToggleShowPassword}
            className="absolute right-0 top-0 grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
          </button>
        </div>
        <PasswordRequirements
          id="staff-password-requirements"
          password={password}
          emptyError={passwordTouched && !password}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={saving || invalid}
        >
          {saving ? "Creating account…" : "Create staff account"}
        </Button>
      </div>
    </form>
  );
}

export function AdminAccountsManager({ userId, initialRole, initialStatus }: { userId: string; initialRole?: string; initialStatus?: string }) {
  const [role, setRole] = useState(known(roleOptions, initialRole));
  const [status, setStatus] = useState(known(statusOptions, initialStatus));
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [inspectingAccount, setInspectingAccount] = useState<AdminAccount | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [accounts, setAccounts] = useState<AdminAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [reason, setReason] = useState("");
  const [unpublish, setUnpublish] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Staff creation state
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffRole, setStaffRole] = useState("verification_officer");
  const [staffFullName, setStaffFullName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      setAccounts(null);
      setError(null);
      const query = new URLSearchParams({ ...(role ? { role } : {}), ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) });
      const result = await adminCall<{ accounts?: AdminAccount[] }>(`/api/admin/accounts${query.size ? `?${query}` : ""}`, userId, undefined, abort.signal);
      if (abort.signal.aborted) return;
      if (result.ok) setAccounts(Array.isArray(result.data.accounts) ? result.data.accounts : []);
      else { setError(result.message); notify("error", "admin-accounts-load", result.message); }
    }, search ? 300 : 0);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [role, status, search, userId, reloadKey]);

  const invalid = reasonProblem(reason, 5) !== null;
  const open = (account: AdminAccount) => { setDialog({ account, suspend: !account.isSuspended, operationId: newOperationId() }); setReason(""); setUnpublish(true); setDialogError(null); };
  const close = () => { if (!saving) setDialog(null); };

  async function confirm() {
    if (!dialog || invalid || saving) return;
    setSaving(true);
    setDialogError(null);
    const result = await submitAccountChange(userId, dialog, reason, unpublish);
    setSaving(false);
    if (!result.ok) { setDialogError(result.message); notify("error", "admin-account-action", result.message); return; }
    setAccounts((list) => list?.map((a) => (a.id === result.account.id ? result.account : a)) ?? list);
    setDialog(null);
    notify("success", "admin-account-action", dialog.suspend ? "Account suspended." : "Account reinstated.");
  }

  async function handleCreateStaff() {
    if (!staffFullName.trim() || !staffEmail.trim() || !validatePasswordStrength(staffPassword).isValid || staffSaving) return;
    setStaffSaving(true);
    setStaffError(null);
    const res = await adminCall<{ success?: boolean }>("/api/admin/accounts", userId, {
      action: "create_staff",
      operationId: newOperationId(),
      role: staffRole,
      fullName: staffFullName.trim(),
      email: staffEmail.trim(),
      password: staffPassword,
    });
    setStaffSaving(false);
    if (!res.ok) {
      setStaffError(res.message);
      notify("error", "admin-create-staff", res.message);
      return;
    }
    notify("success", "admin-create-staff", "Staff account created successfully.");
    setStaffModalOpen(false);
    setShowPassword(false);
    setStaffFullName("");
    setStaffEmail("");
    setStaffPassword("");
    setReloadKey((k) => k + 1);
  }

  const name = dialog?.account.fullName?.trim() || "this account";
  const sortedAccounts = accounts
    ? [...accounts].sort((a, b) => {
        if (sortBy === "properties_desc") return (b.propertyCount ?? 0) - (a.propertyCount ?? 0);
        if (sortBy === "reports_desc") return (b.openReportCount ?? 0) - (a.openReportCount ?? 0);
        return (a.fullName || "").localeCompare(b.fullName || "");
      })
    : [];
  const totalPages = accounts ? Math.max(1, Math.ceil(accounts.length / pageSize)) : 1;
  const validPage = Math.min(page, totalPages);
  const paginatedAccounts = sortedAccounts.slice((validPage - 1) * pageSize, validPage * pageSize);

  return <section aria-label="Account management" className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_10rem_11rem_minmax(0,1fr)] flex-1 min-w-0">
        <Select aria-label="Filter by role" options={roleOptions} value={role} onValueChange={(val) => { setRole(val); setPage(1); }} />
        <Select aria-label="Filter by status" options={statusOptions} value={status} onValueChange={(val) => { setStatus(val); setPage(1); }} />
        <Select aria-label="Sort accounts" options={sortOptions} value={sortBy} onValueChange={(val) => { setSortBy(val); setPage(1); }} />
        <Input type="search" aria-label="Search accounts" placeholder="Search account name…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
      </div>
      <Button variant="primary" onClick={() => { setStaffModalOpen(true); setStaffError(null); }} className="shrink-0 gap-1.5">
        <UserPlus size={16} aria-hidden="true" />
        Create Staff Account
      </Button>
    </div>
    {error ? <Alert variant="error">{error} <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button></Alert>
      : accounts === null ? <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      : accounts.length === 0 ? <Empty>No accounts match these filters.</Empty>
      : <>
          <ul className="m-0 grid list-none gap-3 p-0">{paginatedAccounts.map((account) => <AccountRow key={account.id} account={account} onAction={open} onInspect={setInspectingAccount} />)}</ul>
          <Pagination currentPage={page} totalPages={totalPages} totalItems={accounts.length} pageSize={pageSize} onPageChange={setPage} />
        </>}
    <Modal open={!!dialog} onClose={close} title={dialog?.suspend ? "Suspend account" : "Reinstate account"} description={dialog?.suspend ? `${cap(name)} will be signed out of admin-managed features. This is recorded in the audit log.` : `${cap(name)} will regain access. This is recorded in the audit log.`} className="max-h-[calc(100dvh-2rem)] lg:max-h-[85dvh] overflow-y-auto">
      <div className="grid gap-4">
        <AdminReasonField id="admin-account-reason" label="Reason" value={reason} min={5} onChange={setReason} disabled={saving} />
        {dialog?.suspend && <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={unpublish} onChange={(event) => setUnpublish(event.target.checked)} disabled={saving} className="size-5" />{"Unpublish active & pending listings"}</label>}
        {dialogError && <Alert variant="error">{dialogError}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
          <Button variant={dialog?.suspend ? "destructive" : "primary"} onClick={confirm} disabled={saving || invalid}>{saving ? "Saving…" : dialog?.suspend ? "Suspend account" : "Reinstate account"}</Button>
        </div>
      </div>
    </Modal>

    <Modal
      open={staffModalOpen}
      onClose={() => { if (!staffSaving) { setStaffModalOpen(false); setShowPassword(false); } }}
      title="Create Staff Account"
      description="Create a dedicated officer or support account. Role privileges are assigned immediately."
      className="max-h-[calc(100dvh-2rem)] lg:max-h-[85dvh] max-w-md overflow-y-auto"
    >
      <CreateStaffAccountForm
        role={staffRole}
        onRoleChange={setStaffRole}
        fullName={staffFullName}
        onFullNameChange={setStaffFullName}
        email={staffEmail}
        onEmailChange={setStaffEmail}
        password={staffPassword}
        onPasswordChange={setStaffPassword}
        showPassword={showPassword}
        onToggleShowPassword={() => setShowPassword((prev) => !prev)}
        saving={staffSaving}
        error={staffError}
        onCancel={() => { if (!staffSaving) { setStaffModalOpen(false); setShowPassword(false); } }}
        onSubmit={handleCreateStaff}
      />
    </Modal>

    <Modal
      open={Boolean(inspectingAccount)}
      onClose={() => setInspectingAccount(null)}
      title="Account profile inspection"
      description={inspectingAccount?.fullName || inspectingAccount?.id}
      className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
    >
      {inspectingAccount && (
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{inspectingAccount.fullName?.trim() || "Unnamed account"}</span>
              <div className="flex gap-1.5">
                <Badge variant="outline">{cap(inspectingAccount.role)}</Badge>
                <Badge variant={statusBadgeVariant(inspectingAccount.isSuspended ? "suspended" : "active")}>
                  {inspectingAccount.isSuspended ? "Suspended" : "Active"}
                </Badge>
              </div>
            </div>
            <p className="m-0 font-mono text-xs text-muted-foreground break-all">ID: {inspectingAccount.id}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <p className="m-0 text-xs text-muted-foreground">Portfolio</p>
              <p className="m-0 mt-1 text-xl font-bold">{inspectingAccount.propertyCount ?? 0}</p>
              <p className="m-0 text-xs text-muted-foreground">{inspectingAccount.livePropertyCount ?? 0} live</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="m-0 text-xs text-muted-foreground">Abuse reports</p>
              <p className="m-0 mt-1 text-xl font-bold">{inspectingAccount.openReportCount ?? 0}</p>
              <p className="m-0 text-xs text-muted-foreground">Open reports</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {inspectingAccount.role === "landlord" && (
              <Link
                href={`/admin/reviews?search=${encodeURIComponent(inspectingAccount.fullName || "")}`}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"
              >
                <Building2 size={14} aria-hidden="true" /> View properties
              </Link>
            )}
            <Link
              href="/admin/audit"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"
            >
              <ShieldAlert size={14} aria-hidden="true" /> View audit history
            </Link>
          </div>
        </div>
      )}
    </Modal>
  </section>;
}
