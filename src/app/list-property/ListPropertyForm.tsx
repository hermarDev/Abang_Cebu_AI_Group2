"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, FileText, ImagePlus, MapPin, Upload } from "lucide-react";
import MapSearch from "@/components/map/MapSearch";
import type { PlaceResult } from "@/lib/search/places";
import { propertyTypes } from "@/features/map/FinderQuickFilters";

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
  price: string;
  city: string;
  amenities: string[];
};

export function ListPropertyForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [review, setReview] = useState<ListingReview | null>(null);
  const [location, setLocation] = useState<PlaceResult | null>(null);
  const [address, setAddress] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [permitApplicability, setPermitApplicability] = useState("");
  const [permitDocument, setPermitDocument] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ success: boolean; text: string } | null>(null);

  function validateCurrentStep() {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step-panel="${step}"]`);
    const invalid = panel?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input:invalid, textarea:invalid, select:invalid",
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
        price: value("price"),
        city: value("city"),
        amenities: selectedAmenities,
      });
    }
    setStep(nextStep);
    formRef.current?.scrollIntoView({ block: "start" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== steps.length - 1) {
      continueToNextStep();
      return;
    }
    setNotice(null);
    if (!location) { setNotice({ success: false, text: "Search for and select the property location on the map." }); return; }
    if (!permitApplicability) { setNotice({ success: false, text: "Tell us whether a business permit is required for this rental." }); return; }
    if (permitApplicability === "required" && !permitDocument) { setNotice({ success: false, text: "Upload the current business permit for this property." }); return; }

    const element = event.currentTarget;
    const data = new FormData(element);
    data.set("address", address);
    data.set("latitude", String(location.coordinates[1]));
    data.set("longitude", String(location.coordinates[0]));
    data.delete("photos");
    photos.forEach((photo) => data.append("photos", photo));
    data.set("permitApplicability", permitApplicability);
    data.delete("permitDocument");
    if (permitDocument) data.append("permitDocument", permitDocument);
    setPending(true);
    try {
      const response = await fetch("/api/landlord/listings", { method: "POST", body: data });
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("success" in payload) || payload.success !== true) {
        const reason = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "Your property could not be submitted.";
        throw new Error(reason);
      }
      const message = "message" in payload && typeof payload.message === "string" ? payload.message : "Your property was submitted for review.";
      setNotice({ success: true, text: message });
      element.reset();
      setPhotos([]);
      setPermitDocument(null);
      setPermitApplicability("");
      setLocation(null);
      setAddress("");
      setReview(null);
      setStep(0);
      router.refresh();
    } catch (error) {
      setNotice({ success: false, text: error instanceof Error ? error.message : "Your property could not be submitted." });
    } finally { setPending(false); }
  }

  const selectedAmenities = review?.amenities ?? [];
  const price = Number(review?.price ?? "");
  const section = "grid gap-4 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur-sm sm:p-6";
  const input = "min-h-11 rounded-lg border border-border bg-card px-3 font-normal";

  return <form ref={formRef} noValidate onSubmit={submit} className="grid scroll-mt-20 gap-4">
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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium"><span>Property type</span><select className={input} name="propertyType" defaultValue="" required><option value="" disabled>Select a type</option>{propertyTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Monthly rent (PHP)</span><input className={input} name="price" type="number" min="1" max="10000000" step="1" required placeholder="e.g. 12000" /></label>
        </div>
      </section>
    </div>

    <div className="grid gap-4" data-step-panel="1" hidden={step !== 1} style={step === 1 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="property-location-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><MapPin size={19} aria-hidden="true" /></span><div><h2 id="property-location-heading" className="m-0 text-lg font-semibold">Address and map location</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Select the property location, then confirm its full address.</p></div></div>
        <div className="grid gap-1.5 text-sm font-medium"><span>Find the location</span><MapSearch embedded className="!relative !top-auto !left-auto !z-[4] !w-full" disabled={false} onSelect={(place) => { setLocation(place); setAddress([place.name, place.detail].filter(Boolean).join(", ")); setNotice(null); }} /></div>
        {location && <p className="m-0 flex items-start gap-1.5 text-sm text-green-700"><Check size={16} aria-hidden="true" /> Selected: {[location.name, location.detail].filter(Boolean).join(", ")}</p>}
        <label className="grid gap-1.5 text-sm font-medium"><span>Complete property address</span><input className={input} name="address" value={address} onChange={(event) => setAddress(event.target.value)} required maxLength={1000} placeholder="House/building, street, barangay" /></label>
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
        <label className="relative inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-border bg-card px-4 text-sm font-semibold"><Upload size={17} aria-hidden="true" /> Choose photos<input className="absolute inset-0 h-full w-full cursor-pointer opacity-0" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { const next = Array.from(event.target.files ?? []); if (next.length > 6 || next.some((file) => file.size > 10 * 1024 * 1024)) { setNotice({ success: false, text: "Choose up to 6 photos, with each photo no larger than 10 MB." }); event.target.value = ""; return; } setPhotos(next); setNotice(null); }} /></label>
        {photos.length > 0 && <ul className="m-0 grid gap-1 pl-5 text-xs text-muted-foreground">{photos.map((photo, index) => <li className="truncate" key={photo.name + index}>{photo.name}</li>)}</ul>}
      </section>
    </div>

    <div className="grid gap-4" data-step-panel="3" hidden={step !== 3} style={step === 3 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="business-permit-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><FileText size={19} aria-hidden="true" /></span><div><h2 id="business-permit-heading" className="m-0 text-lg font-semibold">Business permit</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Permit rules depend on the local government and type of rental operation.</p></div></div>
        <p className="m-0 text-sm leading-relaxed text-muted-foreground">Choose the option that applies to this property’s location and rental activity. AbangCebu reviews the permit or your “not required” declaration before publication. Permit files stay private.</p>
        <label className="grid gap-1.5 text-sm font-medium"><span>Does this rental require a local business or Mayor’s permit?</span><select className={input} name="permitApplicability" value={permitApplicability} onChange={(event) => { setPermitApplicability(event.target.value); setPermitDocument(null); setNotice(null); }} required><option value="" disabled>Select the applicable option</option><option value="required">Yes, a permit is required</option><option value="not_required">No, a permit is not required</option></select></label>
        {permitApplicability === "required" && <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium"><span>Permit number</span><input className={input} name="permitNumber" required maxLength={100} placeholder="As shown on the permit" /></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Issuing city or municipality</span><input className={input} name="permitLgu" required maxLength={200} placeholder="e.g. Cebu City" /></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Valid through</span><input className={input} name="permitExpiresOn" type="date" required /></label>
          <label className="relative grid min-h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold sm:mt-6"><span className="inline-flex items-center gap-2"><Upload size={17} aria-hidden="true" /> {permitDocument ? "Change permit file" : "Choose permit file"}</span><input className="absolute inset-0 h-full w-full cursor-pointer opacity-0" name="permitDocument" type="file" accept="application/pdf,image/jpeg,image/png" required onChange={(event) => { const next = event.target.files?.[0] ?? null; if (next && next.size > 10 * 1024 * 1024) { setNotice({ success: false, text: "Choose a permit file no larger than 10 MB." }); event.target.value = ""; setPermitDocument(null); return; } setPermitDocument(next); setNotice(null); }} /></label>
          {permitDocument && <p className="m-0 truncate text-xs text-muted-foreground sm:col-span-2">Selected: {permitDocument.name}</p>}
          <p className="m-0 text-xs text-muted-foreground sm:col-span-2">Upload a current PDF, JPG, or PNG file, up to 10 MB.</p>
        </div>}
        {permitApplicability === "not_required" && <label className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm leading-relaxed"><input className="mt-1 size-4 shrink-0 accent-blue-600" type="checkbox" name="permitNotRequiredConfirmed" value="yes" required /><span>I checked the requirements for this property’s location and rental activity and confirm a business permit is not required.</span></label>}
      </section>
    </div>

    <div className="grid gap-4" data-step-panel="4" hidden={step !== 4} style={step === 4 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="listing-review-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><Check size={19} aria-hidden="true" /></span><div><h2 id="listing-review-heading" className="m-0 text-lg font-semibold">Review your listing</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Check the details before sending your property for review.</p></div></div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property</dt><dd className="mb-0 mt-1 font-semibold">{review?.title || "Not provided"}</dd><dd className="mb-0 mt-1 text-sm text-muted-foreground">{review?.propertyType || "Type not selected"}</dd></div>
          <div className="rounded-xl border border-border p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly rent</dt><dd className="mb-0 mt-1 font-semibold">{price > 0 ? `₱${price.toLocaleString("en-PH")}` : "Not provided"}</dd></div>
          <div className="rounded-xl border border-border p-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</dt><dd className="mb-0 mt-1 font-medium">{address || "Address not provided"}</dd><dd className="mb-0 mt-1 text-sm text-muted-foreground">{review?.city}</dd></div>
          <div className="rounded-xl border border-border p-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amenities</dt><dd className="mb-0 mt-1 text-sm">{selectedAmenities.length ? selectedAmenities.join(", ") : "No amenities selected"}</dd></div>
          <div className="rounded-xl border border-border p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business permit</dt><dd className="mb-0 mt-1 text-sm">{permitApplicability === "required" ? `Required · ${permitDocument?.name ?? "document selected"}` : "Declared not required"}</dd></div>
          <div className="rounded-xl border border-border p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Photos</dt><dd className="mb-0 mt-1 text-sm">{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected` : "No photos added"}</dd></div>
          {review?.description && <div className="rounded-xl border border-border p-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</dt><dd className="mb-0 mt-1 whitespace-pre-wrap text-sm">{review.description}</dd></div>}
        </dl>
        <p className="m-0 text-sm text-muted-foreground">Your property stays private until an admin reviews and approves it.</p>
      </section>
    </div>

    <div className="sticky bottom-0 z-20 -mx-1 flex flex-col gap-3 rounded-2xl border border-border/80 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:bg-slate-950/95 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <p className="m-0 text-center text-sm text-muted-foreground sm:text-left">{step === steps.length - 1 ? "Ready to submit for review" : `${steps.length - step - 1} step${steps.length - step - 1 === 1 ? "" : "s"} remaining`}</p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50" type="button" onClick={() => { setNotice(null); setStep((current) => Math.max(0, current - 1)); formRef.current?.scrollIntoView({ block: "start" }); }} disabled={step === 0 || pending}><ChevronLeft size={17} aria-hidden="true" /> Back</button>
        {step < steps.length - 1
          ? <button className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action-hover disabled:opacity-60" type="button" onClick={continueToNextStep} disabled={pending}>Continue <ChevronRight size={17} aria-hidden="true" /></button>
          : <button className="min-h-11 rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action-hover disabled:opacity-60" type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit for review"}</button>}
      </div>
    </div>
  </form>;
}
