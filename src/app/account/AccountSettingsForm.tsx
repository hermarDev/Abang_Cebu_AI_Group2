"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, type ChangeEvent, type FormEvent } from "react";
import { Camera, KeyRound, LogOut, Mail, Phone, ShieldCheck, UserRound, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
import { parseValidPhoneNumber } from "@/lib/phone-number";
import { removeAccountAvatar, updateAccountAvatar, updateAccountPassword, updateAccountProfile, type AccountActionResult, type AvatarActionResult } from "./actions";

type AccountProfile = {
  fullName: string;
  phoneNumber: string | null;
  email: string;
  role: string;
  avatarUrl: string | null;
};

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
type PhoneCountry = { code: CountryCode; name: string; callingCode: string };
const defaultPhoneCountry: PhoneCountry = { code: "PH", name: "Philippines", callingCode: getCountryCallingCode("PH") };

function getPhoneCountries(): PhoneCountry[] {
  return getCountries()
    .map((code) => ({ code, name: countryNames.of(code) ?? code, callingCode: getCountryCallingCode(code) }))
    .sort((first, second) => first.name < second.name ? -1 : first.name > second.name ? 1 : 0);
}

let cachedPhoneCountries: PhoneCountry[] | null = null;
function subscribeToPhoneCountries() {
  return () => {};
}
function getPhoneCountriesSnapshot() {
  return cachedPhoneCountries ??= getPhoneCountries();
}

function ActionMessage({ result }: { result: AccountActionResult | null }) {
  if (!result) return null;
  return <p role={result.success ? "status" : "alert"} className={`rounded-lg border px-3 py-2 text-sm ${result.success ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
    {result.message}
  </p>;
}

export function AccountSettingsForm({ profile }: { profile: AccountProfile }) {
  const parsedSavedPhone = profile.phoneNumber ? parsePhoneNumberFromString(profile.phoneNumber) : undefined;
  const initialPhoneCountry: CountryCode = parsedSavedPhone?.country ?? "PH";
  const initialPhoneNumber = parsedSavedPhone?.nationalNumber ?? profile.phoneNumber?.replace(/\D/g, "") ?? "";
  const initialPhoneOption = useMemo<PhoneCountry>(() => initialPhoneCountry === "PH"
    ? defaultPhoneCountry
    : { code: initialPhoneCountry, name: initialPhoneCountry, callingCode: getCountryCallingCode(initialPhoneCountry) }, [initialPhoneCountry]);
  const initialPhoneOptions = useMemo(() => [initialPhoneOption], [initialPhoneOption]);
  const phoneCountries = useSyncExternalStore(subscribeToPhoneCountries, getPhoneCountriesSnapshot, () => initialPhoneOptions);
  const [fullName, setFullName] = useState(profile.fullName);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(initialPhoneCountry);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [savedProfile, setSavedProfile] = useState({ fullName: profile.fullName.trim().replace(/\s+/g, " "), phoneCountry: initialPhoneCountry, phoneNumber: initialPhoneNumber });
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileResult, setProfileResult] = useState<AccountActionResult | null>(null);
  const [passwordResult, setPasswordResult] = useState<AccountActionResult | null>(null);
  const [avatarResult, setAvatarResult] = useState<AvatarActionResult | null>(null);
  const [profilePending, startProfileTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const [avatarPending, startAvatarTransition] = useTransition();
  const avatarInput = useRef<HTMLInputElement>(null);
  const normalizedFullName = fullName.trim().replace(/\s+/g, " ");
  const maxPhoneDigits = phoneCountry === "PH" ? 11 : 15;
  const parsedPhoneNumber = phoneNumber ? parseValidPhoneNumber(phoneNumber, phoneCountry) : null;
  const phoneIsValid = !phoneNumber || parsedPhoneNumber !== null;
  const hasProfileChanges = normalizedFullName !== savedProfile.fullName
    || phoneNumber !== savedProfile.phoneNumber
    || (phoneNumber.length > 0 && phoneCountry !== savedProfile.phoneCountry);

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

  async function prepareAvatar(file: File): Promise<File> {
    const image = await createImageBitmap(file);
    try {
      const maximumBytes = 2 * 1024 * 1024;
      const dimensions = [512, 384, 256];
      const qualities = [0.82, 0.68, 0.55];

      for (const maximumDimension of dimensions) {
        const scale = Math.min(1, maximumDimension / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Image preparation is unavailable.");
        context.drawImage(image, 0, 0, width, height);

        for (const quality of qualities) {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
          if (blob && blob.size <= maximumBytes) {
            return new File([blob], "profile-photo.webp", { type: "image/webp", lastModified: Date.now() });
          }
        }
      }
    } finally {
      image.close();
    }
    throw new Error("This photo could not be prepared for upload.");
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
      const result = await updateAccountAvatar(formData);
      setAvatarResult(result);
      if (result.success) {
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
      const result = await removeAccountAvatar();
      setAvatarResult(result);
      if (result.success) {
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
      const result = await updateAccountProfile(formData);
      setProfileResult(result);
      if (result.success && result.profile) {
        const savedPhone = result.profile.phoneNumber ? parsePhoneNumberFromString(result.profile.phoneNumber) : undefined;
        const savedPhoneCountry: CountryCode = savedPhone?.country ?? "PH";
        const savedPhoneNumber = savedPhone?.nationalNumber ?? "";
        setFullName(result.profile.fullName);
        setPhoneCountry(savedPhoneCountry);
        setPhoneNumber(savedPhoneNumber);
        setSavedProfile({ fullName: result.profile.fullName, phoneCountry: savedPhoneCountry, phoneNumber: savedPhoneNumber });
      }
    });
  }

  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setPasswordResult(null);
    startPasswordTransition(async () => {
      const result = await updateAccountPassword(formData);
      setPasswordResult(result);
      if (result.success) form.reset();
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
              {avatarUrl && <Button type="button" variant="ghost" disabled={avatarPending} onClick={clearAvatar}>{avatarPending ? "Updating…" : "Remove photo"}</Button>}
            </div>
          </div>
        </div>
        <ActionMessage result={avatarResult} />
        <form className="grid gap-4" onSubmit={saveProfile}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid content-start gap-1.5 text-sm font-medium" htmlFor="account-full-name">
              Full name
              <Input id="account-full-name" name="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" minLength={2} maxLength={100} required />
            </label>
            <div className="grid content-start gap-1.5 text-sm font-medium sm:col-span-2">
              <label htmlFor="account-phone-number">Phone number <span className="font-normal text-muted-foreground">(optional)</span></label>
              <div className={`flex h-11 min-w-0 items-center rounded-[var(--radius)] border bg-background px-1 transition-colors focus-within:ring-2 ${phoneNumber && !phoneIsValid ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20" : "border-input focus-within:border-ring focus-within:ring-ring/30"}`}>
                <span className="w-[44%] max-w-40 min-w-0 shrink-0">
                  <Select appearance="embedded" aria-label="Phone country" name="phoneCountry" value={phoneCountry} onValueChange={(value) => { const country = value as CountryCode; setPhoneCountry(country); if (country === "PH") setPhoneNumber((current) => current.slice(0, 11)); setProfileResult(null); }} options={phoneCountries.map((country) => ({ value: country.code, label: `${country.name} (+${country.callingCode})`, shortLabel: `${country.code} +${country.callingCode}` }))} className="h-10 min-w-0 text-sm text-foreground" />
                </span>
                <span className="my-2 h-6 w-px shrink-0 bg-border" aria-hidden="true" />
                <span className="relative block min-w-0 flex-1">
                  <Phone className="pointer-events-none absolute left-2.5 top-3 size-[18px] text-muted-foreground" aria-hidden="true" />
                  <Input appearance="embedded" id="account-phone-number" name="phoneNumber" className="h-10 w-full pl-9 pr-2" type="tel" value={phoneNumber} onChange={(event) => { setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, maxPhoneDigits)); setProfileResult(null); }} autoComplete="tel-national" inputMode="numeric" pattern="[0-9]*" maxLength={maxPhoneDigits} aria-invalid={Boolean(phoneNumber) && !phoneIsValid} aria-describedby={Boolean(phoneNumber) && !phoneIsValid ? "account-phone-error" : undefined} />
                </span>
              </div>
              {phoneNumber && !phoneIsValid && <span id="account-phone-error" className="text-xs font-normal text-destructive">Enter a valid {phoneCountries.find((country) => country.code === phoneCountry)?.name ?? "selected country"} phone number.</span>}
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
          <div><h2 id="password-heading" className="text-lg font-semibold">Password and security</h2><p className="mt-1 text-sm text-muted-foreground">Choose a strong password you haven’t used elsewhere.</p></div>
        </header>
        <form className="grid gap-4" onSubmit={changePassword}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid content-start gap-1.5 text-sm font-medium" htmlFor="account-new-password">
              New password
              <Input id="account-new-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
            </label>
            <label className="grid content-start gap-1.5 text-sm font-medium" htmlFor="account-confirm-password">
              Confirm new password
              <Input id="account-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
            </label>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">Use 8–72 characters and at least 3 of: uppercase, lowercase, number, and symbol.</p>
          <ActionMessage result={passwordResult} />
          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={passwordPending}>{passwordPending ? "Updating…" : "Update password"}</Button>
          </div>
        </form>
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
          <div><h2 id="session-heading" className="text-base font-semibold">Session</h2><p className="mt-1 text-sm text-muted-foreground">Sign out of your AbangCebu account on this device.</p></div>
        </div>
        <Link href="/auth/logout" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-card-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <LogOut size={17} aria-hidden="true" /> Sign out
        </Link>
      </section>
      <p className="px-1 text-sm leading-relaxed text-muted-foreground">Need help with your account? <a className="font-medium text-action hover:underline" href="mailto:support@abangcebu.ai">Contact support</a>.</p>
    </aside>
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
