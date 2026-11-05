"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { Camera, Eye, EyeOff, KeyRound, LogOut, Mail, ShieldCheck, UserRound, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notify } from "@/components/ui/AppToaster";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { normalizePhilippineAccountMobile } from "@/lib/phone-number";
import { validatePasswordStrength } from "@/types/auth";
import { prepareAvatar } from "./prepare-avatar";
import { removeAccountAvatar, updateAccountAvatar, updateAccountPassword, updateAccountProfile, type AccountActionResult, type AvatarActionResult } from "./actions";

type AccountProfile = {
  fullName: string;
  phoneNumber: string | null;
  email: string;
  role: string;
  avatarUrl: string | null;
};

function displayPhone(value: string | null) {
  const normalized = value ? normalizePhilippineAccountMobile(value) : null;
  return normalized ? `0${normalized.slice(3)}` : value ?? "";
}

function ActionMessage({ result }: { result: AccountActionResult | null }) {
  if (!result) return null;
  return <p role={result.success ? "status" : "alert"} className={`rounded-lg border px-3 py-2 text-sm ${result.success ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
    {result.message}
  </p>;
}

function PasswordDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (result: AccountActionResult) => void }) {
  const [values, setValues] = useState({ current: "", password: "", confirm: "" });
  const [visible, setVisible] = useState({ current: false, password: false, confirm: false });
  const [error, setError] = useState<AccountActionResult | null>(null);
  const [currentTouched, setCurrentTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const fields = [
    { key: "current", label: "Current password", autoComplete: "current-password" },
    { key: "password", label: "New password", autoComplete: "new-password" },
    { key: "confirm", label: "Confirm new password", autoComplete: "new-password" },
  ] as const;
  const strength = validatePasswordStrength(values.password);
  const mismatch = confirmTouched && (!values.confirm || values.password !== values.confirm);
  const passwordsMatch = !!values.password && !!values.confirm && values.password === values.confirm;
  const samePassword = !!values.current && !!values.password && values.current === values.password;
  const currentError = error?.field === "currentPassword" ? error.message : currentTouched && !values.current ? "Enter your current password." : null;

  function reset() {
    setValues({ current: "", password: "", confirm: "" });
    setVisible({ current: false, password: false, confirm: false });
    setError(null);
    setCurrentTouched(false);
    setPasswordTouched(false);
    setConfirmTouched(false);
  }
  function close() {
    if (submitting.current) return;
    reset();
    onClose();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !values.current || !strength.isValid || samePassword || values.password !== values.confirm) return;
    const form = event.currentTarget;
    submitting.current = true;
    setPending(true);
    setError(null);
    const data = new FormData();
    data.set("currentPassword", values.current);
    data.set("password", values.password);
    data.set("confirmPassword", values.confirm);
    try {
      const result = await updateAccountPassword(data);
      if (result.success) {
        reset();
        onClose();
        onSuccess(result);
      } else {
        setError(result);
        if (result.field === "currentPassword") form.querySelector<HTMLInputElement>("#account-current")?.focus();
      }
    } catch {
      setError({ success: false, message: "We couldn’t confirm whether your password was updated. Check before trying again." });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return <Modal open={open} onClose={close} title="Change password" description="Enter your current password and choose a new one." className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
    <form className="grid gap-4" onSubmit={submit}>
      {fields.map(({ key, label, autoComplete }) => <div key={key} className="grid gap-1.5">
        <label htmlFor={`account-${key}`} className="text-sm font-medium">{label}</label>
        <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { if (key === "current") setCurrentTouched(true); if (key === "password") setPasswordTouched(true); if (key === "confirm") setConfirmTouched(true); } }}>
          <Input id={`account-${key}`} type={visible[key] ? "text" : "password"} autoComplete={autoComplete} maxLength={72} value={values[key]} onChange={(event) => { setValues({ ...values, [key]: event.target.value }); if (key === "current" && error?.field === "currentPassword") setError(null); }} aria-invalid={(key === "password" && ((passwordTouched && !strength.isValid) || samePassword)) || (key === "confirm" && mismatch) || (key === "current" && !!currentError)} aria-describedby={key === "password" ? `password-requirements${samePassword ? " password-same" : ""}` : key === "confirm" && (mismatch || passwordsMatch) ? "password-mismatch" : key === "current" && currentError ? "account-current-error" : undefined} className="pr-12" />
          <button type="button" aria-label={`${visible[key] ? "Hide" : "Show"} ${label.toLowerCase()}`} onClick={() => setVisible({ ...visible, [key]: !visible[key] })} className="absolute right-0 top-0 grid size-11 place-items-center rounded-lg text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{visible[key] ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
        </div>
        {key === "current" && currentError && <p id="account-current-error" role={error?.field === "currentPassword" ? "alert" : undefined} className="text-xs text-destructive">{currentError}</p>}
        {key === "password" && samePassword && <p id="password-same" className="text-xs text-destructive">Choose a different password.</p>}
        {key === "password" && <PasswordRequirements id="password-requirements" password={values.password} emptyError={passwordTouched && !values.password} />}
        {key === "confirm" && (mismatch || passwordsMatch) && <p id="password-mismatch" className={`text-xs ${mismatch ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>{mismatch ? (values.confirm ? "Passwords do not match." : "Confirm your new password.") : <><span aria-hidden="true">✓ </span>Passwords match.</>}</p>}
      </div>)}
      {error?.field !== "currentPassword" && <ActionMessage result={error} />}
      {pending && <p role="status" className="text-sm text-muted-foreground">Updating your password…</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={close} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending || !values.current || !strength.isValid || samePassword || values.password !== values.confirm}>{pending ? "Updating…" : "Update password"}</Button></div>
    </form>
  </Modal>;
}

export function AccountSettingsForm({ profile }: { profile: AccountProfile }) {
  const initialPhoneNumber = displayPhone(profile.phoneNumber);
  const [fullName, setFullName] = useState(profile.fullName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [savedProfile, setSavedProfile] = useState({ fullName: profile.fullName.trim().replace(/\s+/g, " "), phoneNumber: initialPhoneNumber });
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [removePhotoOpen, setRemovePhotoOpen] = useState(false);
  const [passwordPreviewOpen, setPasswordPreviewOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileResult, setProfileResult] = useState<AccountActionResult | null>(null);
  const [avatarResult, setAvatarResult] = useState<AvatarActionResult | null>(null);
  const [profilePending, startProfileTransition] = useTransition();
  const [avatarPending, startAvatarTransition] = useTransition();
  const avatarInput = useRef<HTMLInputElement>(null);
  const normalizedFullName = fullName.trim().replace(/\s+/g, " ");
  const phoneIsValid = !phoneNumber.trim() || phoneNumber === savedProfile.phoneNumber || (/^09\d{9}$/.test(phoneNumber) && normalizePhilippineAccountMobile(phoneNumber) !== null);
  const hasProfileChanges = normalizedFullName !== savedProfile.fullName || phoneNumber !== savedProfile.phoneNumber;

  useEffect(() => () => {
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setAvatarResult(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarResult({ success: false, message: "Choose a JPG, PNG, or WebP image." });
      event.currentTarget.value = "";
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function saveAvatar() {
    const selectedFile = avatarFile;
    if (!selectedFile) return;
    setAvatarResult(null);
    startAvatarTransition(async () => {
      let preparedFile: File;
      try {
        preparedFile = await prepareAvatar(selectedFile);
      } catch {
        setAvatarResult({ success: false, message: "This photo could not be prepared. Please try another image." });
        return;
      }

      const formData = new FormData();
      formData.set("avatar", preparedFile);
      let result: AvatarActionResult;
      try {
        result = await updateAccountAvatar(formData);
      } catch {
        result = { success: false, message: "We couldn’t confirm whether your photo was updated. Check your profile before trying again." };
      }
      setAvatarResult(result.success ? null : result);
      if (result.success) {
        notify("success", "account-avatar-updated", result.message);
        setAvatarUrl(result.avatarUrl ?? null);
        setAvatarPreview(result.avatarUrl ?? null);
        setAvatarFile(null);
        if (avatarInput.current) avatarInput.current.value = "";
      }
    });
  }

  function clearAvatar() {
    setAvatarResult(null);
    startAvatarTransition(async () => {
      let result: AvatarActionResult;
      try {
        result = await removeAccountAvatar();
      } catch {
        result = { success: false, message: "We couldn’t confirm whether your photo was removed. Check your profile before trying again." };
      }
      setAvatarResult(result.success ? null : result);
      setRemovePhotoOpen(false);
      if (result.success) {
        notify("success", "account-avatar-removed", result.message);
        setAvatarUrl(null);
        setAvatarPreview(null);
        setAvatarFile(null);
        if (avatarInput.current) avatarInput.current.value = "";
      }
    });
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setProfileResult(null);
    startProfileTransition(async () => {
      try {
        const result = await updateAccountProfile(formData);
        setProfileResult(result.success ? null : result);
        if (result.success) notify("success", "account-profile-saved", result.message);
        if (result.success && result.profile) {
          const savedPhoneNumber = displayPhone(result.profile.phoneNumber);
          setFullName(result.profile.fullName);
          setPhoneNumber(savedPhoneNumber);
          setSavedProfile({ fullName: result.profile.fullName, phoneNumber: savedPhoneNumber });
        }
      } catch {
        setProfileResult({ success: false, message: "We couldn’t confirm whether your changes were saved. Check your profile before trying again." });
      }
    });
  }

  return <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,.65fr)]">
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6" aria-labelledby="profile-details-heading">
        <header className="mb-5 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><UserRound size={20} aria-hidden="true" /></span>
          <div><h2 id="profile-details-heading" className="text-lg font-semibold">Personal details</h2><p className="mt-1 text-sm text-muted-foreground">Keep the contact information on your profile up to date.</p></div>
        </header>
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/50 p-4">
          {avatarPreview
            ? <button type="button" aria-label="View profile photo" title="View full-size profile photo" onClick={() => setAvatarPreviewOpen(true)} className="group relative grid size-16 shrink-0 cursor-zoom-in place-items-center overflow-visible rounded-full border border-border bg-card text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <Image src={avatarPreview} alt="" width={64} height={64} unoptimized className="size-full rounded-full object-cover" />
              <span className="absolute bottom-0 right-0 grid size-6 translate-x-1 translate-y-1 place-items-center rounded-full border border-border bg-card text-action shadow-sm"><ZoomIn size={14} aria-hidden="true" /></span>
            </button>
            : <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-card text-muted-foreground"><UserRound size={26} aria-hidden="true" /></div>}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Profile photo</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <input ref={avatarInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a profile photo" onChange={chooseAvatar} />
              <Button type="button" variant="outline" disabled={avatarPending} onClick={() => avatarInput.current?.click()}><Camera size={16} aria-hidden="true" /> Choose photo</Button>
              {avatarFile && <Button type="button" disabled={avatarPending} onClick={saveAvatar}>{avatarPending ? "Uploading…" : "Upload photo"}</Button>}
              {avatarUrl && <Button type="button" variant="ghost" className="hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive" disabled={avatarPending} onClick={() => setRemovePhotoOpen(true)}>Remove photo</Button>}
            </div>
          </div>
        </div>
        <ActionMessage result={avatarResult} />
        <form className="grid gap-4" onSubmit={saveProfile}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid content-start gap-1.5 text-sm font-medium" htmlFor="account-full-name">
              Full name
              <Input id="account-full-name" name="fullName" value={fullName} disabled={profilePending} onChange={(event) => setFullName(event.target.value)} autoComplete="name" minLength={2} maxLength={100} required />
            </label>
            <div className="grid content-start gap-1.5 text-sm font-medium sm:col-span-2">
              <label htmlFor="account-phone-number">Phone number <span className="font-normal text-muted-foreground">(optional)</span></label>
              <div className={`flex h-11 min-w-0 items-center rounded-[var(--radius)] border bg-background px-1 transition-colors focus-within:ring-2 ${phoneNumber && !phoneIsValid ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20" : "border-input focus-within:border-ring focus-within:ring-ring/30"}`}>
                <span className="flex shrink-0 items-center gap-2 px-3 text-sm text-foreground" aria-label="Philippines"><span aria-hidden="true">🇵🇭</span><span>PH</span></span>
                <span className="my-2 h-6 w-px shrink-0 bg-border" aria-hidden="true" />
                <Input appearance="embedded" id="account-phone-number" name="phoneNumber" className="h-10 min-w-0 flex-1 px-3" type="tel" value={phoneNumber} disabled={profilePending} onChange={(event) => { setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 11)); setProfileResult(null); }} placeholder="Enter phone number" autoComplete="tel-national" inputMode="numeric" maxLength={11} aria-invalid={!phoneIsValid} aria-describedby={!phoneIsValid ? "account-phone-error" : undefined} />
              </div>
              {!phoneIsValid && <span id="account-phone-error" role="alert" className="text-xs font-normal text-destructive">Enter a Philippine mobile number, such as 0912 345 6789.</span>}
            </div>
          </div>
          <ActionMessage result={profileResult} />
          <div className="flex justify-end">
            <Button type="submit" disabled={profilePending || !hasProfileChanges || !phoneIsValid}>{profilePending ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6" aria-labelledby="password-heading">
        <header className="mb-5 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><KeyRound size={20} aria-hidden="true" /></span>
          <div><h2 id="password-heading" className="text-lg font-semibold">Password and security</h2><p className="mt-1 text-sm text-muted-foreground">Manage your password and account security.</p></div>
        </header>
        <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold">Password</p><p className="mt-1 text-sm text-muted-foreground">Update your password to keep your account secure.</p></div>
          <Button type="button" variant="outline" onClick={() => setPasswordPreviewOpen(true)}>Change password</Button>
        </div>
      </section>
    </div>

    <aside className="grid gap-6">
      <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6" aria-labelledby="account-info-heading">
        <header className="mb-5 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><ShieldCheck size={20} aria-hidden="true" /></span>
          <div><h2 id="account-info-heading" className="text-lg font-semibold">Account information</h2><p className="mt-1 text-sm text-muted-foreground">Your sign-in email and account type.</p></div>
        </header>
        <div className="grid gap-4">
          <div className="flex items-start gap-3">
            <Mail size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">Email address</p><p className="mt-1 break-all text-sm font-medium">{profile.email || "Unavailable"}</p></div>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">Account type</p>
            <p className="mt-1 inline-flex rounded-full bg-accent px-2.5 py-1 text-sm font-semibold capitalize text-accent-foreground">{profile.role}</p>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6" aria-labelledby="session-heading">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><LogOut size={20} aria-hidden="true" /></span>
          <div><h2 id="session-heading" className="text-base font-semibold">Session</h2><p className="mt-1 text-sm text-muted-foreground">Log out of your AbangCebu account on this device.</p></div>
        </div>
        <Link href="/auth/logout" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-card-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <LogOut size={17} aria-hidden="true" /> Log out
        </Link>
      </section>
      <p className="px-1 text-sm leading-relaxed text-muted-foreground">Need help with your account? <a className="font-medium text-action hover:underline" href="mailto:support@abangcebu.ai">Contact support</a>.</p>
    </aside>
    <PasswordDialog open={passwordPreviewOpen} onClose={() => setPasswordPreviewOpen(false)} onSuccess={(result) => notify("success", "account-password-updated", result.message)} />
    <Modal
      open={removePhotoOpen}
      onClose={() => { if (!avatarPending) setRemovePhotoOpen(false); }}
      title="Remove your profile photo?"
      description="You can upload another one anytime."
    >
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={avatarPending} onClick={() => setRemovePhotoOpen(false)}>Cancel</Button>
        <Button variant="destructive" disabled={avatarPending} onClick={clearAvatar}>{avatarPending ? "Removing…" : "Remove photo"}</Button>
      </div>
    </Modal>
    {avatarPreview && <Modal
      open={avatarPreviewOpen}
      onClose={() => setAvatarPreviewOpen(false)}
      title="Profile photo"
      description={fullName.trim() ? `${fullName.trim()}'s profile photo` : "Your profile photo"}
      className="max-w-3xl"
      closeControl={<button type="button" aria-label="Close profile photo" className="absolute right-0 top-0 grid size-11 place-items-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><X size={18} aria-hidden="true" /></button>}
    >
      <div className="relative mx-auto h-[64dvh] max-h-[42rem] min-h-[8rem] w-full max-w-3xl overflow-hidden rounded-xl bg-muted">
        <Image src={avatarPreview} alt="Profile photo" fill sizes="(max-width: 768px) 90vw, 48rem" unoptimized className="object-contain" />
      </div>
    </Modal>}
  </div>;
}
