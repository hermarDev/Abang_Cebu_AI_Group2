"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ChevronLeft, ChevronRight, FileText, ImagePlus, MapPin, Upload } from "lucide-react";
import MapSearch from "@/components/map/MapSearch";
import type { PlaceResult } from "@/lib/search/places";
import { createDraftPayload, restoreDraftValues, restoredMediaName } from "./draft-payload";
import { BrowserDraftIntentRepository } from "./draft-retry-store";
import { executeDraftSave, type DraftSaveFile, type DraftSaveIntent } from "./draft-save-client";

const propertyTypes = [
  ["apartment", "Apartment"], ["condominium", "Condominium"], ["house", "House"],
  ["townhouse", "Townhouse"], ["commercial", "Commercial"], ["boarding_house", "Boarding house"],
] as const;

const amenities = [
  ["wifi", "Wi-Fi"], ["aircon", "Air conditioning"], ["cooking", "Cooking allowed"], ["laundry", "Laundry area"],
  ["water_included", "Water included"], ["electricity_included", "Electricity included"],
  ["motorcycle_parking", "Motorcycle parking"], ["car_parking", "Car parking"],
] as const;

const steps = ["Property details", "Location", "Amenities & photos", "Business permit", "Review"];
type ListingReview = {
  title: string;
  description: string;
  propertyType: string;
  rentalType: string;
  barangay: string;
  price: string;
  city: string;
  amenities: string[];
};

export function ListPropertyForm({ userId, restoreTarget }: { userId: string; restoreTarget?: { draftId: string; revision: string } | null }) {
  const restoreDraftFilesRef = useRef<(id: string | undefined) => Promise<void>>(() => Promise.resolve());
  const formRef = useRef<HTMLFormElement>(null);
  const fileEdits = useRef(0);
  const preservedDraftValues = useRef<ReturnType<typeof restoreDraftValues>["preserved"]>(undefined);
  const [step, setStep] = useState(0);
  const [review, setReview] = useState<ListingReview | null>(null);
  const [location, setLocation] = useState<PlaceResult | null>(null);
  const [address, setAddress] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [permitApplicability, setPermitApplicability] = useState("");
  const [permitDocument, setPermitDocument] = useState<File | null>(null);
  const [permitNotRequiredConfirmed, setPermitNotRequiredConfirmed] = useState(false);
  const pending = false;
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [revision, setRevision] = useState(1);
  const [notice, setNotice] = useState<{ success: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [drafts, setDrafts] = useState<Array<{ id: string; revision: unknown; payload: unknown }> | null>(null);
  const [draftError, setDraftError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/property-drafts", { headers: { "x-expected-user-id": userId }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load drafts");
        const body: unknown = await response.json();
        if (!body || typeof body !== "object" || !("drafts" in body) || !Array.isArray(body.drafts)) throw new Error("Invalid draft response");
        if (!controller.signal.aborted) setDrafts(body.drafts.filter((draft: unknown): draft is { id: string; revision: unknown; payload: unknown } => !!draft && typeof draft === "object" && "id" in draft && typeof draft.id === "string" && "payload" in draft).map((draft) => ({ ...draft, revision: draft.revision })));
      })
      .catch(() => { if (!controller.signal.aborted) setDraftError("Saved drafts could not be loaded. Refresh to try again."); });
    return () => controller.abort();
  }, [userId]);

  function restoreDraft(target: { id: string; revision: unknown; payload: unknown }) {
    if (dirty || photos.length || permitDocument) {
      setDraftError("Your current form contains unsaved information. Open a fresh form to restore a draft.");
      return;
    }
    if (typeof target.revision !== "number" || !Number.isSafeInteger(target.revision) || target.revision < 1) {
      setDraftError("This draft has an invalid revision and cannot be safely restored.");
      return;
    }
    try {
      const values = restoreDraftValues(target.payload);
      const form = formRef.current;
      if (!form) return;
      for (const name of ["title", "description", "propertyType", "rentalType", "price", "barangay", "city", "bathroomType", "maxOccupants", "permitNumber", "permitLgu", "permitExpiresOn"] as const) {
        const input = form.elements.namedItem(name);
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) input.value = values[name];
      }
      form.querySelectorAll<HTMLInputElement>('input[name="amenities"]').forEach((input) => { input.checked = values.amenities.includes(input.value); });
      setAddress(values.address);
      setLocation(values.location);
      setPermitApplicability(values.permitApplicability);
      setPermitNotRequiredConfirmed(values.permitNotRequiredConfirmed);
      preservedDraftValues.current = values.preserved;
      setDirty(true);
      setDraftError("");
      setRevision(target.revision);
      setDraftId(target.id);
      const draftIdToRestore = target.id;
      queueMicrotask(() => { void restoreDraftFilesRef.current(draftIdToRestore); });
    } catch {
      setDraftError("This draft contains information this form cannot safely restore. It has not been changed.");
    }
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const restoreKey = restoreTarget ? `${restoreTarget.draftId}:${restoreTarget.revision}` : "";
  const restoredRef = useRef("");
  useEffect(() => {
    if (!restoreKey || restoredRef.current === restoreKey || !drafts) return;
    const [id, revisionText] = restoreKey.split(":");
    const revisionNumber = Number(revisionText);
    const target = drafts.find((draft) => draft.id === id && draft.revision === revisionNumber);
    if (!target) {
      queueMicrotask(() => setDraftError("The requested draft revision is unavailable. Refresh the dashboard before trying again."));
      return;
    }
    restoredRef.current = restoreKey;
    queueMicrotask(() => {
      const values = (() => { try { return restoreDraftValues(target.payload); } catch { return null; } })();
      if (!values) { setDraftError("This draft contains information this form cannot safely restore. It has not been changed."); return; }
      restoreDraft(target);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreKey, drafts]);

  function validateCurrentStep() {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step-panel="${step}"]`);
    const invalid = panel?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input:invalid:not(:disabled), textarea:invalid:not(:disabled), select:invalid:not(:disabled)",
    );
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    if (step === 1 && !location) {
      setNotice({ success: false, text: "Search for and select the property location on the map." });
      return false;
    }
    setNotice(null);
    return true;
  }

  function continueToNextStep() {
    if (!validateCurrentStep()) return;
    const nextStep = Math.min(step + 1, steps.length - 1);
    if (nextStep === steps.length - 1 && formRef.current) {
      const form = formRef.current;
      const value = (name: string) => form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? "";
      const selectedAmenities = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="amenities"]:checked'))
        .map((input) => amenities.find(([amenityValue]) => amenityValue === input.value)?.[1] ?? input.value);
      setReview({
        title: value("title"),
        description: value("description"),
        propertyType: value("propertyType"),
        rentalType: value("rentalType"),
        barangay: value("barangay"),
        price: value("price"),
        city: value("city"),
        amenities: selectedAmenities,
      });
    }
    setStep(nextStep);
    formRef.current?.scrollIntoView({ block: "start" });
  }

  async function restoreDraftFiles(id: string | undefined) {
    if (!id) return;
    const initialFileEdits = fileEdits.current;
    try {
      const response = await fetch(`/api/property-drafts/media?draftId=${encodeURIComponent(id)}`, { headers: { "x-expected-user-id": userId } });
      if (!response.ok) throw new Error("media load failed");
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("media" in body) || !Array.isArray(body.media)) throw new Error("bad media response");
      const files: File[] = [];
      let permit: File | null = null;
      for (const item of body.media) {
        if (!item || typeof item !== "object" || !("kind" in item) || (item.kind !== "photo" && item.kind !== "permit") || !("signedUrl" in item) || typeof item.signedUrl !== "string" || !("sizeBytes" in item) || typeof item.sizeBytes !== "number" || !Number.isSafeInteger(item.sizeBytes) || item.sizeBytes < 1 || item.sizeBytes > 10 * 1024 * 1024 || !("sha256" in item) || typeof item.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(item.sha256)) throw new Error("invalid media entry");
        const fileResponse = await fetch(item.signedUrl);
        if (!fileResponse.ok) throw new Error("media download failed");
        const blob = await fileResponse.blob();
        if (blob.size !== item.sizeBytes) throw new Error("media size mismatch");
        const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
        if (Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("") !== item.sha256) throw new Error("media digest mismatch");
        const contentType = String((item as { contentType?: string }).contentType ?? blob.type);
        const name = restoredMediaName(item.sha256, contentType, (item as { originalName?: unknown }).originalName);
        const file = new File([blob], name, { type: contentType });
        if (item.kind === "photo") files.push(file);
        else if (permit) throw new Error("multiple saved permits");
        else permit = file;
        if (files.length > 6) throw new Error("too many saved photos");
      }
      if (fileEdits.current !== initialFileEdits) {
        setDraftError("Saved files were not restored because your file selection changed. Your current files were kept.");
        return;
      }
      setPhotos(files);
      setPermitDocument(permit);
      setDraftId(id);
    } catch { setDraftError("Saved files could not be restored. Refresh to try again."); }
  }
  useEffect(() => { restoreDraftFilesRef.current = restoreDraftFiles; });

  function currentValues() {
    const form = formRef.current;
    if (!form) throw new Error("form unavailable");
    const value = (name: string) => form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? "";
    return {
      title: value("title"), description: value("description"), propertyType: value("propertyType"), rentalType: value("rentalType"), price: value("price"),
      address, barangay: value("barangay"), city: value("city"), bathroomType: value("bathroomType"), maxOccupants: value("maxOccupants"),
      amenities: Array.from(form.querySelectorAll<HTMLInputElement>('input[name="amenities"]:checked')).map((input) => input.value),
      permitApplicability, permitNumber: value("permitNumber"), permitLgu: value("permitLgu"), permitExpiresOn: value("permitExpiresOn"),
      permitNotRequiredConfirmed, location, preserved: preservedDraftValues.current,
    };
  }

  async function saveDraft() {
    if (saving) return;
    setSaving(true);
    try {
      const repository = new BrowserDraftIntentRepository();
      const existing = await repository.listPending(userId);
      if (existing.length > 1) {
        setDraftError("Multiple unfinished saves were found. Your current entries have not been sent.");
        return;
      }
      if (existing.length === 1) {
        const saved = await executeDraftSave(existing[0], repository);
        setDraftId(saved.draftId);
        setRevision(saved.revision);
        setNotice({ success: true, text: "The earlier save was recovered. Your current entries were kept." });
        return;
      }
      const values = currentValues();
      const files: DraftSaveFile[] = [
        ...photos.map((file): DraftSaveFile => ({ kind: "photo", operationId: crypto.randomUUID(), file })),
        ...(permitDocument ? [{ kind: "permit" as const, operationId: crypto.randomUUID(), file: permitDocument }] : []),
      ];
      const intent: DraftSaveIntent = {
        id: crypto.randomUUID(), ownerId: userId, operationId: crypto.randomUUID(),
        payload: createDraftPayload(values), values, files, createdAt: Date.now(),
        ...(draftId ? { draftId, revision } : {}),
      };
      const saved = await executeDraftSave(intent, repository);
      setDraftId(saved.draftId);
      setRevision(saved.revision);
      setNotice({ success: true, text: files.length ? "Draft and files saved." : "Draft saved." });
    } catch { setNotice({ success: false, text: "The save outcome could not be confirmed. Your entries were kept." }); }
    finally { setSaving(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== steps.length - 1) { continueToNextStep(); return; }
    // The submission workflow remains unavailable until its recovery and review gates pass.
    return;
  }

  async function submitListing() {
    if (!draftId || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/landlord/properties", { method: "POST", headers: { "content-type": "application/json", "x-expected-user-id": userId }, body: JSON.stringify({ operationId: crypto.randomUUID(), draftId, expectedRevision: revision }) });
      if (response.status === 409) { setNotice({ success: false, text: "This draft changed elsewhere. Reload the saved draft before submitting." }); return; }
      if (!response.ok) throw new Error("submit failed");
      setNotice({ success: true, text: "Listing submitted for review. Status: pending." });
      setDirty(false);
    } catch { setNotice({ success: false, text: "Submission could not be confirmed. Your draft was kept; retry when ready." }); }
    finally { setSaving(false); }
  }

  const selectedAmenities = review?.amenities ?? [];
  const price = Number(review?.price ?? "");
  const section = "grid gap-4 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur-sm sm:p-6";
  const input = "min-h-11 rounded-lg border border-border bg-card px-3 font-normal";

  return <form ref={formRef} noValidate onSubmit={submit} onChange={(event) => { if (event.target instanceof HTMLInputElement && event.target.type === "file") fileEdits.current++; setDirty(true); }} className="grid scroll-mt-20 gap-4">
    {draftError && <p role="alert">{draftError}</p>}
    {drafts && drafts.length > 0 && <section aria-label="Saved drafts" className={section}><h2 className="m-0 font-semibold">Saved drafts</h2>{drafts.map((draft) => {
      let title = "Untitled draft";
      try { title = restoreDraftValues(draft.payload).title || title; } catch { /* Keep unsupported drafts visible. */ }
      return <button type="button" className="min-h-11 rounded-lg border border-border px-3 text-left" key={draft.id} onClick={() => restoreDraft(draft)}>Restore {title}</button>;
    })}</section>}
    {notice && <p role={notice.success ? "status" : "alert"} className={notice.success ? "m-0 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-800" : "m-0 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800"}>{notice.text}</p>}

    <section className="rounded-2xl border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur-sm sm:p-5" aria-label="Listing progress">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold">Step {step + 1} of {steps.length}</span>
        <span className="text-right text-muted-foreground">{steps[step]}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Listing progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
        <div className="h-full rounded-full bg-action transition-[width] duration-200" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-3 hidden grid-cols-5 gap-2 text-center text-[0.7rem] text-muted-foreground sm:grid">
        {steps.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} className={step === index ? "font-semibold text-action" : undefined}>{label}</li>)}
      </ol>
    </section>

    <div className="grid gap-4" data-step-panel="0" hidden={step !== 0} style={step === 0 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="property-details-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><MapPin size={19} aria-hidden="true" /></span><div><h2 id="property-details-heading" className="m-0 text-lg font-semibold">Property details</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Tell renters what makes your place a good fit.</p></div></div>
        <label className="grid gap-1.5 text-sm font-medium"><span>Property name</span><input className={input} name="title" required maxLength={200} placeholder="e.g. Mabolo Studio near IT Park" /></label>
        <label className="grid gap-1.5 text-sm font-medium"><span>Description</span><textarea className="min-h-28 rounded-lg border border-border bg-card p-3 font-normal" name="description" required minLength={20} maxLength={4000} placeholder="Describe the space, included features, and helpful renter details." /></label>
        <label className="grid gap-1.5 text-sm font-medium"><span>Property type</span><select className={input} name="propertyType" defaultValue="" required><option value="" disabled>Select a property type</option>{propertyTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <fieldset className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold">First rental unit</legend>
          <p className="m-0 text-sm text-muted-foreground sm:col-span-2">Add the type and monthly rent for the first unit at this property.</p>
          <label className="grid gap-1.5 text-sm font-medium"><span>Unit type</span><select className={input} name="rentalType" defaultValue="" required><option value="" disabled>Select a unit type</option><option value="entire_place">Entire place</option><option value="private_room">Private room</option><option value="shared_room">Shared room</option><option value="bedspace">Bedspace</option></select></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Monthly rent (PHP)</span><input className={input} name="price" type="number" min="1" max="10000000" step="1" required placeholder="e.g. 12000" /></label>
        </fieldset>
      </section>
    </div>

    <div className="grid gap-4" data-step-panel="1" hidden={step !== 1} style={step === 1 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="property-location-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><MapPin size={19} aria-hidden="true" /></span><div><h2 id="property-location-heading" className="m-0 text-lg font-semibold">Address and map location</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Select the property location, then confirm its full address.</p></div></div>
        <div className="grid gap-1.5 text-sm font-medium"><span>Find the location</span><MapSearch embedded className="!relative !top-auto !left-auto !z-[4] !w-full" disabled={false} onSelect={(place) => { setDirty(true); setLocation(place); setAddress([place.name, place.detail].filter(Boolean).join(", ")); setNotice(null); }} /></div>
        {location && <p className="m-0 flex items-start gap-1.5 text-sm text-green-700"><Check size={16} aria-hidden="true" /> Selected: {[location.name, location.detail].filter(Boolean).join(", ")}</p>}
        <label className="grid gap-1.5 text-sm font-medium"><span>Complete property address</span><input className={input} name="address" value={address} onChange={(event) => setAddress(event.target.value)} required maxLength={1000} placeholder="House/building, street, barangay" /></label>
        <label className="grid gap-1.5 text-sm font-medium"><span>Barangay</span><input className={input} name="barangay" required maxLength={200} placeholder="Enter barangay" /></label>
        <label className="grid gap-1.5 text-sm font-medium"><span>City or municipality</span><input className={input} name="city" required maxLength={200} defaultValue="Cebu City" /></label>
      </section>
    </div>

    <div className="grid gap-4" data-step-panel="2" hidden={step !== 2} style={step === 2 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="property-amenities-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><Check size={19} aria-hidden="true" /></span><div><h2 id="property-amenities-heading" className="m-0 text-lg font-semibold">Amenities and details</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Select the amenities available to renters.</p></div></div>
        <fieldset className="grid gap-2 border-0 p-0 sm:grid-cols-2"><legend className="mb-2 text-sm font-medium">Amenities</legend>{amenities.map(([value, label]) => <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm" key={value}><input className="size-4 accent-blue-600" type="checkbox" name="amenities" value={value} /><span>{label}</span></label>)}</fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium"><span>Bathroom</span><select className={input} name="bathroomType" defaultValue=""><option value="">Not specified</option><option value="private">Private</option><option value="shared">Shared</option></select></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Maximum occupants</span><input className={input} name="maxOccupants" type="number" min="1" max="1000" placeholder="Optional" /></label>
        </div>
      </section>
      <section className={section} aria-labelledby="property-photos-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><ImagePlus size={19} aria-hidden="true" /></span><div><h2 id="property-photos-heading" className="m-0 text-lg font-semibold">Property photos</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Optional: up to 6 JPG, PNG, or WebP photos, 10 MB each.</p></div></div>
        <label className="relative inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-border bg-card px-4 text-sm font-semibold"><Upload size={17} aria-hidden="true" /> Choose photos<input className="absolute inset-0 h-full w-full cursor-pointer opacity-0" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { const next = Array.from(event.target.files ?? []); if (next.length > 6 || next.some((file) => file.size > 10 * 1024 * 1024)) { setNotice({ success: false, text: "Choose up to 6 photos, with each photo no larger than 10 MB. Your previous selection was kept." }); event.target.value = ""; return; } setPhotos(next); setNotice(null); }} /></label>
        {photos.length > 0 && <ul className="m-0 grid gap-1 pl-5 text-xs text-muted-foreground">{photos.map((photo, index) => <li className="truncate" key={photo.name + index}>{photo.name}</li>)}</ul>}
      </section>
    </div>

    <div className="grid gap-4" data-step-panel="3" hidden={step !== 3} style={step === 3 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="business-permit-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><FileText size={19} aria-hidden="true" /></span><div><h2 id="business-permit-heading" className="m-0 text-lg font-semibold">Business permit</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Permit rules depend on the local government and type of rental operation.</p></div></div>
        <p className="m-0 text-sm leading-relaxed text-muted-foreground">Choose the option that applies to this property’s location and rental activity. AbangCebu reviews the permit or your “not required” declaration before publication. Permit files stay private.</p>
        <label className="grid gap-1.5 text-sm font-medium"><span>Does this rental require a local business or Mayor’s permit?</span><select className={input} name="permitApplicability" value={permitApplicability} onChange={(event) => { setPermitApplicability(event.target.value); setNotice(null); }} required><option value="" disabled>Select the applicable option</option><option value="required">Yes, a permit is required</option><option value="not_required">No, a permit is not required</option></select></label>
        <fieldset disabled={permitApplicability !== "required"} className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2" hidden={permitApplicability !== "required"} style={permitApplicability === "required" ? undefined : { display: "none" }}>
          <label className="grid gap-1.5 text-sm font-medium"><span>Permit number</span><input className={input} name="permitNumber" required maxLength={100} placeholder="As shown on the permit" /></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Issuing city or municipality</span><input className={input} name="permitLgu" required maxLength={200} placeholder="e.g. Cebu City" /></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Valid through</span><input className={input} name="permitExpiresOn" type="date" required /></label>
          <label className="relative grid min-h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold sm:mt-6"><span className="inline-flex items-center gap-2"><Upload size={17} aria-hidden="true" /> {permitDocument ? "Change permit file" : "Choose permit file"}</span><input className="absolute inset-0 h-full w-full cursor-pointer opacity-0" name="permitDocument" type="file" accept="application/pdf,image/jpeg,image/png" required={!permitDocument} onChange={(event) => { const next = event.target.files?.[0] ?? null; if (next && next.size > 10 * 1024 * 1024) { setNotice({ success: false, text: "Choose a permit file no larger than 10 MB. Your previous selection was kept." }); event.target.value = ""; return; } setPermitDocument(next); setNotice(null); }} /></label>
          {permitDocument && <p className="m-0 truncate text-xs text-muted-foreground sm:col-span-2">Selected: {permitDocument.name}</p>}
          <p className="m-0 text-xs text-muted-foreground sm:col-span-2">Upload a current PDF, JPG, or PNG file, up to 10 MB.</p>
        </fieldset>
        {permitApplicability === "not_required" && <label className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm leading-relaxed"><input className="mt-1 size-4 shrink-0 accent-blue-600" type="checkbox" name="permitNotRequiredConfirmed" value="yes" checked={permitNotRequiredConfirmed} onChange={(event) => { if (preservedDraftValues.current) preservedDraftValues.current.emptyPermitConfirmation = false; setPermitNotRequiredConfirmed(event.target.checked); }} required /><span>I checked the requirements for this property’s location and rental activity and confirm a business permit is not required.</span></label>}
      </section>
    </div>

    <div className="grid gap-4" data-step-panel="4" hidden={step !== 4} style={step === 4 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="listing-review-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><Check size={19} aria-hidden="true" /></span><div><h2 id="listing-review-heading" className="m-0 text-lg font-semibold">Review your listing</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Check the details before sending your property for review.</p></div></div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property</dt><dd className="mb-0 mt-1 font-semibold">{review?.title || "Not provided"}</dd><dd className="mb-0 mt-1 text-sm text-muted-foreground">{propertyTypes.find(([value]) => value === review?.propertyType)?.[1] ?? "Type not selected"} · {({ entire_place: "Entire place", private_room: "Private room", shared_room: "Shared room", bedspace: "Bedspace" } as Record<string, string>)[review?.rentalType ?? ""] ?? "Unit type not selected"}</dd></div>
          <div className="rounded-xl border border-border p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly rent</dt><dd className="mb-0 mt-1 font-semibold">{price > 0 ? `₱${price.toLocaleString("en-PH")}` : "Not provided"}</dd></div>
          <div className="rounded-xl border border-border p-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</dt><dd className="mb-0 mt-1 font-medium">{address || "Address not provided"}</dd><dd className="mb-0 mt-1 text-sm text-muted-foreground">{[review?.barangay, review?.city].filter(Boolean).join(", ")}</dd></div>
          <div className="rounded-xl border border-border p-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amenities</dt><dd className="mb-0 mt-1 text-sm">{selectedAmenities.length ? selectedAmenities.join(", ") : "No amenities selected"}</dd></div>
          <div className="rounded-xl border border-border p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business permit</dt><dd className="mb-0 mt-1 text-sm">{permitApplicability === "required" ? `Required · ${permitDocument?.name ?? "document selected"}` : "Declared not required"}</dd></div>
          <div className="rounded-xl border border-border p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Photos</dt><dd className="mb-0 mt-1 text-sm">{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected` : "No photos added"}</dd></div>
          {review?.description && <div className="rounded-xl border border-border p-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</dt><dd className="mb-0 mt-1 whitespace-pre-wrap text-sm">{review.description}</dd></div>}
        </dl>
        <p className="m-0 text-sm text-muted-foreground">Submission is not available yet.</p>
      </section>
    </div>

    <div className="sticky bottom-0 z-20 -mx-1 flex flex-col gap-3 rounded-2xl border border-border/80 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:bg-slate-950/95 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <p className="m-0 text-center text-sm text-muted-foreground sm:text-left">{step === steps.length - 1 ? "Preview only" : `${steps.length - step - 1} step${steps.length - step - 1 === 1 ? "" : "s"} remaining`}</p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50" type="button" onClick={() => { void saveDraft(); }} disabled>Save draft unavailable</button>
        <button className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50" type="button" onClick={() => { setNotice(null); setStep((current) => Math.max(0, current - 1)); formRef.current?.scrollIntoView({ block: "start" }); }} disabled={step === 0 || pending}><ChevronLeft size={17} aria-hidden="true" /> Back</button>
        {step < steps.length - 1
          ? <button className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action-hover disabled:opacity-60" type="button" onClick={continueToNextStep} disabled={pending}>Continue <ChevronRight size={17} aria-hidden="true" /></button>
          : <button className="min-h-11 rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action-hover disabled:opacity-60" type="button" onClick={() => { void submitListing(); }} disabled>Submission unavailable</button>}
      </div>
    </div>
  </form>;
}