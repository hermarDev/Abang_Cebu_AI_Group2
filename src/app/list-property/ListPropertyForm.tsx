"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, FileText, ImagePlus, MapPin, Upload } from "lucide-react";
import MapSearch from "@/components/map/MapSearch";
import MapCanvasLoader from "@/components/map/MapCanvasLoader";
import { useFinderTheme } from "@/features/map/useFinderTheme";
import { notify } from "@/components/ui/AppToaster";
import { PLACE_BOUNDS, type PlaceResult } from "@/lib/search/places";
import { createDraftPayload, restoreDraftValues, restoredMediaName } from "./draft-payload";
import { BrowserDraftIntentRepository } from "./draft-retry-store";
import { executeDraftSave, type DraftSaveFile, type DraftSaveIntent } from "./draft-save-client";

const propertyTypes = [
  ["apartment", "Apartment"], ["condominium", "Condominium"], ["house", "House"],
  ["townhouse", "Townhouse"], ["commercial", "Commercial"], ["boarding_house", "Boarding house"],
] as const;

// Unit types that make sense per property type: whole-property rentals for
// standalone/commercial spaces, room-level rentals for boarding houses.
const unitTypesByPropertyType: Record<string, readonly string[]> = {
  apartment: ["entire_place", "private_room", "shared_room", "bedspace"],
  condominium: ["entire_place", "private_room", "shared_room", "bedspace"],
  house: ["entire_place", "private_room", "shared_room", "bedspace"],
  townhouse: ["entire_place", "private_room", "shared_room", "bedspace"],
  commercial: ["entire_place"],
  boarding_house: ["entire_place", "private_room", "shared_room", "bedspace"],
};
const allUnitTypes = ["entire_place", "private_room", "shared_room", "bedspace"] as const;
const unitTypeLabels: Record<string, string> = { entire_place: "Entire place", private_room: "Private room", shared_room: "Shared room", bedspace: "Bedspace" };

function getCityGuidance(city: string) {
  const norm = (city || "").trim().toLowerCase();
  if (norm.includes("mandaue")) {
    return {
      cityName: "Mandaue City",
      text: "Mandaue City typically looks for a City Business Permit / Mayor's Permit or Barangay Business Clearance, accompanied by Fire Safety Inspection Certificate (FSIC) and Sanitary Permit. For individual residential owners leasing rooms or units, a proof of ownership (Tax Declaration or Transfer Certificate of Title) or authorization letter is commonly reviewed.",
    };
  }
  if (norm.includes("lapu-lapu") || norm.includes("lapu lapu")) {
    return {
      cityName: "Lapu-Lapu City",
      text: "Lapu-Lapu City verification standardly accepts the Mayor's Business Permit, Barangay Clearance for Leasing, and Fire Safety Inspection Certificate. Condominium and subdivision rentals may also provide HOA clearance or Land Title / Tax Declaration.",
    };
  }
  if (norm.includes("talisay")) {
    return {
      cityName: "Talisay City",
      text: "Talisay City guidelines recognize business permits issued by the City Hall or Barangay Clearance alongside sanitary and fire certificates. For residential accommodations, ownership proof (Tax Declaration / Deed) is also accepted.",
    };
  }
  if (norm.includes("cebu")) {
    return {
      cityName: "Cebu City",
      text: "Cebu City typically reviews the Mayor's Business Permit and Barangay Clearance for commercial/commercial-residential rentals, or Fire Safety Inspection Certificate (FSIC). Individual property owners offering residential rooms or houses may provide a Tax Declaration or Proof of Ownership if commercial registration is not required.",
    };
  }
  return {
    cityName: city.trim() || "Metro Cebu LGU",
    text: "Local Government Units across Cebu typically verify rental listings through a Mayor's / Business Permit, Barangay Clearance, Fire Safety Inspection Certificate (FSIC), or Sanitary Permit. Individual residential landlords may provide ownership proof (Tax Declaration, Deed of Sale, or HOA authorization) when commercial permits are not applicable.",
  };
}

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
  tenantPolicy: string;
};

function PermitThumbnail({ file, className = "size-12 rounded object-cover" }: { file: File; className?: string }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  // Blob URLs are local previews and cannot use the image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} alt="" className={className} />;
}

const fileSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const sameFiles = (a: File[], b: File[]) => a.length === b.length && a.every((f, i) => f.name === b[i].name && f.size === b[i].size && f.type === b[i].type);

export function ListPropertyForm({ userId, restoreTarget }: { userId: string; restoreTarget?: { draftId: string; revision: string; lockedLocation?: boolean } | null }) {
  const { resolvedTheme } = useFinderTheme();
  let router: ReturnType<typeof useRouter> | null = null;
  // The standalone notification harness renders this form without Next's app router, where useRouter throws.
  // The hook still runs on every render in the same order; only its invariant error is caught.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  try { router = useRouter(); } catch { router = null; }
  const restoreDraftFilesRef = useRef<(id: string | undefined) => Promise<void>>(() => Promise.resolve());
  const formRef = useRef<HTMLFormElement>(null);
  const fileEdits = useRef(0);
  const locationRequest = useRef(0);
  const manuallyEdited = useRef({ address: false, barangay: false, city: false });
  useEffect(() => () => { locationRequest.current++; }, []);
  const preservedDraftValues = useRef<ReturnType<typeof restoreDraftValues>["preserved"]>(undefined);
  const legacyPermit = useRef({ permitNumber: "", permitLgu: "", permitExpiresOn: "" });
  const isLocationLocked = Boolean(restoreTarget?.lockedLocation);
  const [step, setStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [review, setReview] = useState<ListingReview | null>(null);
  const [location, setLocation] = useState<PlaceResult | null>(null);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Cebu City");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [floorAreaSqm, setFloorAreaSqm] = useState("");
  const [furnishedStatus, setFurnishedStatus] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [permitPhotos, setPermitPhotos] = useState<File[]>([]);
  const [documentCategories, setDocumentCategories] = useState<Record<string, string>>({});
  const [permitExemptionReason, setPermitExemptionReason] = useState("");
  const [isDraggingPermits, setIsDraggingPermits] = useState(false);
  const [permitError, setPermitError] = useState("");
  const permitSelectionBusy = useRef(false);
  const [permitNotRequiredConfirmed, setPermitNotRequiredConfirmed] = useState(false);
  const [confirmedMedia, setConfirmedMedia] = useState<Array<{ operationId: string; sha256: string; kind: "photo" | "permit" }>>([]);
  const pending = false;
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [revision, setRevision] = useState(1);
  const [savedSnapshot, setSavedSnapshot] = useState<{ payload: string; photos: File[]; permits: File[] } | null>(null);
  const restoredValuesRef = useRef<ReturnType<typeof restoreDraftValues> | null>(null);
  const submissionOpRef = useRef<string | null>(null);
  const [notice, setNotice] = useState<{ success: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [formEdits, setFormEdits] = useState(0);
  const [propertyType, setPropertyType] = useState("");
  const [rentalType, setRentalType] = useState("");
  const [drafts, setDrafts] = useState<Array<{ id: string; revision: unknown; payload: unknown }> | null>(null);
  const [draftError, setDraftError] = useState("");

  async function loadDrafts() {
    if (!userId) return;
    const response = await fetch("/api/property-drafts", { headers: { "x-expected-user-id": userId } });
    if (!response.ok) return;
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("drafts" in body) || !Array.isArray(body.drafts)) return;
    setDrafts(body.drafts.filter((draft: unknown): draft is { id: string; revision: unknown; payload: unknown } => !!draft && typeof draft === "object" && "id" in draft && typeof draft.id === "string" && "payload" in draft).map((draft) => ({ ...draft, revision: draft.revision })));
  }

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
    if (dirty || photos.length || permitPhotos.length) {
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
      legacyPermit.current = { permitNumber: values.permitNumber, permitLgu: values.permitLgu, permitExpiresOn: values.permitExpiresOn };
      for (const name of ["title", "description", "propertyType", "rentalType", "price", "barangay", "city", "bathroomType", "maxOccupants", "tenantPolicy"] as const) {
        const input = form.elements.namedItem(name);
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) input.value = (values as unknown as Record<string, string>)[name] ?? (name === "tenantPolicy" ? "any" : "");
      }
      form.querySelectorAll<HTMLInputElement>('input[name="amenities"]').forEach((input) => { input.checked = values.amenities.includes(input.value); });
      setPropertyType((values as unknown as Record<string, string>).propertyType ?? "");
      setRentalType((values as unknown as Record<string, string>).rentalType ?? "");
      setAddress(values.address);
      setCity(values.city || "Cebu City");
      setBedrooms(String(values.preserved?.unit?.bedrooms ?? ""));
      setBathrooms(String(values.preserved?.unit?.bathrooms ?? ""));
      setFloorAreaSqm(String(values.preserved?.unit?.floor_area_sqm ?? ""));
      setFurnishedStatus(String(values.preserved?.unit?.furnished_status ?? ""));
      manuallyEdited.current = { address: Boolean(values.address), barangay: Boolean(values.barangay), city: Boolean(values.city) };
      setLocation(values.location);
      if (values.permitApplicability === "not_required" || values.permitNotRequiredConfirmed) setPermitNotRequiredConfirmed(true);
      else setPermitNotRequiredConfirmed(false);
      if (typeof values.preserved?.property?.permit_exemption_reason === "string") {
        setPermitExemptionReason(values.preserved.property.permit_exemption_reason);
      } else {
        setPermitExemptionReason("");
      }
      if (typeof values.preserved?.property?.document_categories === "string") {
        try { setDocumentCategories(JSON.parse(values.preserved.property.document_categories)); } catch { setDocumentCategories({}); }
      } else {
        setDocumentCategories({});
      }
      preservedDraftValues.current = values.preserved;
      restoredValuesRef.current = values;
      setSavedSnapshot(null);
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
  const autosaveKey = `list-property:form:${userId}`;
  const hydratedRef = useRef(false);
  // Re-fill unsaved entries after a refresh; server drafts still win via restoreTarget.
  useEffect(() => {
    if (restoreKey || hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = sessionStorage.getItem(autosaveKey);
      if (!raw) return;
      const snapshot = restoreDraftValues(JSON.parse(raw));
      const form = formRef.current;
      if (!form) return;
      for (const name of ["title", "description", "propertyType", "rentalType", "price", "barangay", "city", "bathroomType", "maxOccupants", "tenantPolicy"] as const) {
        const input = form.elements.namedItem(name);
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) input.value = (snapshot as unknown as Record<string, string>)[name] ?? (name === "tenantPolicy" ? "any" : "");
      }
      form.querySelectorAll<HTMLInputElement>('input[name="amenities"]').forEach((input) => { input.checked = snapshot.amenities.includes(input.value); });
      if (snapshot.permitNotRequiredConfirmed) {
        const confirm = form.querySelector<HTMLInputElement>('input[name="permitNotRequiredConfirmed"]');
        if (confirm) confirm.checked = true;
      }
      queueMicrotask(() => {
        setPropertyType(snapshot.propertyType);
        setAddress(snapshot.address);
        setLocation(snapshot.location);
        setPermitNotRequiredConfirmed(snapshot.permitNotRequiredConfirmed);
        setDirty(true);
      });
    } catch { sessionStorage.removeItem(autosaveKey); }
  }, [restoreKey, autosaveKey]);
  function currentValues() {
    const form = formRef.current;
    if (!form) throw new Error("form unavailable");
    const value = (name: string) => form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? "";
    const permitApplicabilityCalculated = permitPhotos.length > 0 ? "required" : permitNotRequiredConfirmed ? "not_required" : "";

    const preservedUnit: Record<string, string | number | null> = { ...(preservedDraftValues.current?.unit ?? {}) };
    const bedroomsVal = value("bedrooms");
    if (bedroomsVal !== "") preservedUnit.bedrooms = Number(bedroomsVal);
    const bathroomsVal = value("bathrooms");
    if (bathroomsVal !== "") preservedUnit.bathrooms = Number(bathroomsVal);
    const floorAreaVal = value("floorAreaSqm");
    if (floorAreaVal !== "") preservedUnit.floor_area_sqm = Number(floorAreaVal);
    const furnishedVal = value("furnishedStatus");
    if (furnishedVal !== "") preservedUnit.furnished_status = furnishedVal;

    const preservedProp: Record<string, string | number | null> = { ...(preservedDraftValues.current?.property ?? {}) };
    if (permitExemptionReason.trim()) preservedProp.permit_exemption_reason = permitExemptionReason.trim();
    if (Object.keys(documentCategories).length > 0) preservedProp.document_categories = JSON.stringify(documentCategories);

    return {
      title: value("title"), description: value("description"), propertyType: value("propertyType"), rentalType: value("rentalType"), price: value("price"),
      address, barangay: value("barangay"), city: value("city"), bathroomType: value("bathroomType"), maxOccupants: value("maxOccupants"),
      amenities: Array.from(form.querySelectorAll<HTMLInputElement>('input[name="amenities"]:checked')).map((input) => input.value),
      permitApplicability: permitApplicabilityCalculated, ...legacyPermit.current,
      permitNotRequiredConfirmed, location,
      preserved: {
        property: preservedProp,
        unit: preservedUnit,
        emptyPermitConfirmation: preservedDraftValues.current?.emptyPermitConfirmation ?? false,
      },
      tenantPolicy: value("tenantPolicy") || "any",
    };
  }

  useEffect(() => {
    if (!dirty || restoreKey) return;
    try { sessionStorage.setItem(autosaveKey, JSON.stringify(createDraftPayload(currentValues()))); } catch { /* storage full/blocked: refresh just starts empty */ }
    // currentValues reads the live form; autosaveKey/restoreKey guard the effect's scope
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, formEdits, step, photos.length, permitPhotos.length, permitNotRequiredConfirmed, address, location, restoreKey, autosaveKey]);
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

  function clearAutomaticLocation() {
    if (!manuallyEdited.current.address) setAddress("");
    for (const field of ["barangay", "city"] as const) {
      const input = formRef.current?.elements.namedItem(field);
      if (!manuallyEdited.current[field] && input instanceof HTMLInputElement) input.value = "";
    }
  }

  async function choosePin(coordinates: [number, number], place?: PlaceResult) {
    const [longitude, latitude] = coordinates;
    const request = ++locationRequest.current;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < PLACE_BOUNDS.west || longitude > PLACE_BOUNDS.east || latitude < PLACE_BOUNDS.south || latitude > PLACE_BOUNDS.north) {
      setNotice({ success: false, text: "Choose a location within Cebu." });
      // Restore the previous marker after an invalid drag.
      setLocation((current) => current ? { ...current, coordinates: [...current.coordinates] } : null);
      return;
    }
    setDirty(true);
    clearAutomaticLocation();
    setLocation(place ?? { id: `pin-${longitude}-${latitude}`, name: "Dropped pin", detail: "", coordinates });
    setNotice(null);
    try {
      const response = await fetch(`/api/places/reverse?lat=${latitude}&lon=${longitude}`);
      if (!response.ok) throw new Error("lookup failed");
      const body: unknown = await response.json();
      if (request !== locationRequest.current) return;
      if (!body || typeof body !== "object" || !("place" in body) || !body.place || typeof body.place !== "object") throw new Error("no address");
      const result = body.place as Record<string, unknown>;
      if (!manuallyEdited.current.address && typeof result.address === "string" && result.address) setAddress(result.address.slice(0, 1000));
      for (const field of ["barangay", "city"] as const) {
        const input = formRef.current?.elements.namedItem(field);
        if (!manuallyEdited.current[field] && input instanceof HTMLInputElement && typeof result[field] === "string" && result[field]) input.value = result[field].slice(0, 200);
      }
    } catch {
      if (request === locationRequest.current) setNotice({ success: false, text: "Address lookup is unavailable. The pin was kept; enter the address manually." });
    }
  }

  async function selectPermitPhotos(next: File[]) {
    if (!next.length) return;
    fileEdits.current++;
    if (permitSelectionBusy.current) { setPermitError("Please wait for the current file check."); return; }
    const initialEdits = fileEdits.current;
    const all = [...permitPhotos, ...next];
    if (all.length > 5 || next.some((file) => file.size === 0 || file.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setPermitError("Choose up to 5 different JPG, PNG, WebP or PDF files, each no larger than 10 MB. Your previous selection was kept.");
      return;
    }
    permitSelectionBusy.current = true;
    try {
      // Content hash, not filename: same-named documents are allowed, identical files are not.
      const digests = await Promise.all(all.map(async (file) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())), (byte) => byte.toString(16).padStart(2, "0")).join("")));
      if (fileEdits.current !== initialEdits) { setPermitError("Files changed while checking. Your current selection was kept; choose the files again."); return; }
      if (new Set(digests).size !== digests.length) { setPermitError("Choose different permit files. Your previous selection was kept."); return; }
      setPermitPhotos(all);
      setDirty(true);
      setPermitError("");
      setNotice(null);
    } catch { setPermitError("Files could not be checked. Your previous selection was kept."); }
    finally { permitSelectionBusy.current = false; }
  }

  function validateStep(index: number) {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step-panel="${index}"]`);
    const invalid = panel?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input:invalid:not(:disabled), textarea:invalid:not(:disabled), select:invalid:not(:disabled)",
    );
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    if (index === 3 && permitSelectionBusy.current) {
      setNotice({ success: false, text: "Please wait while permit files are checked." });
      return false;
    }
    if (index === 3 && permitPhotos.length === 0 && !permitNotRequiredConfirmed) {
      setNotice({ success: false, text: "Upload at least one permit/clearance document, or confirm the residential exemption declaration below." });
      return false;
    }
    if (index === 1 && !location) {
      setNotice({ success: false, text: "Search for and select the property location on the map." });
      return false;
    }
    setNotice(null);
    return true;
  }

  function populateReview() {
    if (!formRef.current) return;
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
      tenantPolicy: value("tenantPolicy") || "any",
    });
  }

  function continueToNextStep() {
    if (!validateStep(step)) return;
    const nextStep = Math.min(step + 1, steps.length - 1);
    if (nextStep === steps.length - 1) populateReview();
    setMaxVisitedStep((curr) => Math.max(curr, nextStep));
    setStep(nextStep);
    formRef.current?.scrollIntoView({ block: "start" });
  }

  function jumpToStep(targetIndex: number) {
    if (targetIndex === step) return;
    if (targetIndex < step) {
      setNotice(null);
      setStep(targetIndex);
      formRef.current?.scrollIntoView({ block: "start" });
      return;
    }
    if (targetIndex <= maxVisitedStep + 1 && validateStep(step)) {
      if (targetIndex === steps.length - 1) populateReview();
      setMaxVisitedStep((curr) => Math.max(curr, targetIndex));
      setStep(targetIndex);
      formRef.current?.scrollIntoView({ block: "start" });
    }
  }

  async function restoreDraftFiles(id: string | undefined) {
    if (!id) return;
    const initialFileEdits = fileEdits.current;
    try {
      const response = await fetch(`/api/property-drafts/media?draftId=${encodeURIComponent(id)}`, { headers: { "x-expected-user-id": userId } });
      if (!response.ok) throw new Error("media load failed");
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("media" in body) || !Array.isArray(body.media)) throw new Error("bad media response");
      let photoCount = 0;
      let permitCount = 0;
      for (const item of body.media) {
        if (!item || typeof item !== "object" || !("kind" in item) || (item.kind !== "photo" && item.kind !== "permit") || !("signedUrl" in item) || typeof item.signedUrl !== "string" || !("sizeBytes" in item) || typeof item.sizeBytes !== "number" || !Number.isSafeInteger(item.sizeBytes) || item.sizeBytes < 1 || item.sizeBytes > 10 * 1024 * 1024 || !("sha256" in item) || typeof item.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(item.sha256)) throw new Error("invalid media entry");
        if (item.kind === "photo") photoCount++;
        else permitCount++;
        if (photoCount > 6 || permitCount > 5) throw new Error("too many saved files");
      }
      const restored = await Promise.all(body.media.map(async (item) => {
        const fileResponse = await fetch(item.signedUrl);
        if (!fileResponse.ok) throw new Error("media download failed");
        const blob = await fileResponse.blob();
        if (blob.size !== item.sizeBytes) throw new Error("media size mismatch");
        const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
        if (Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("") !== item.sha256) throw new Error("media digest mismatch");
        const contentType = String((item as { contentType?: string }).contentType ?? blob.type);
        const name = restoredMediaName(item.sha256, contentType, (item as { originalName?: unknown }).originalName);
        const file = new File([blob], name, { type: contentType });
        return { kind: item.kind, file, meta: { operationId: item.operationId, sha256: item.sha256, kind: item.kind } };
      }));
      // Promise.all preserves input order, so photos/permits keep the saved order.
      const files = restored.filter((entry) => entry.kind === "photo").map((entry) => entry.file);
      const permits = restored.filter((entry) => entry.kind === "permit").map((entry) => entry.file);
      const restoredMeta = restored.map((entry) => entry.meta);
      if (fileEdits.current !== initialFileEdits) {
        setDraftError("Saved files were not restored because your file selection changed. Your current files were kept.");
        return;
      }
      setPhotos(files);
      setPermitPhotos(permits);
      setConfirmedMedia(restoredMeta);
      setDraftId(id);
      // Set savedSnapshot so submitListing can verify the draft state matches
      if (restoredValuesRef.current) {
        setSavedSnapshot({
          payload: JSON.stringify(createDraftPayload(restoredValuesRef.current)),
          photos: files,
          permits: permits
        });
      }
    } catch { setDraftError("Saved files could not be restored. Refresh to try again."); }
  }
  useEffect(() => { restoreDraftFilesRef.current = restoreDraftFiles; });

  // Persists the current entries and files; surfaces failures itself and returns null.
  async function persistDraft(): Promise<{ draftId: string; revision: number; message: string; recovered: boolean } | null> {
    setSavedSnapshot(null);
    try {
      const repository = new BrowserDraftIntentRepository();
      const existing = await repository.listPending(userId);
      if (existing.length > 1) {
        const message = "Multiple unfinished saves were found. Your current entries have not been sent.";
        setDraftError(message);
        notify("error", "property-draft-save", message);
        return null;
      }
      if (existing.length === 1) {
        try {
          const saved = await executeDraftSave(existing[0], repository);
          setDraftId(saved.draftId);
          setRevision(saved.revision);
          return { ...saved, message: "The earlier save was recovered. Your current entries were kept.", recovered: true };
        } catch {
          // If the pending save failed permanently (e.g. 400/409/claim conflict), discard it so it does not block future saves
          await repository.deletePending(existing[0].ownerId, existing[0].id, existing[0].storageVersion ?? 0).catch(() => {});
        }
      }
      const values = currentValues();
      const photoFilesWithOp = await Promise.all(photos.map(async (file): Promise<DraftSaveFile> => {
        const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        const sha = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        const existingFile = confirmedMedia.find((m) => m.kind === "photo" && m.sha256 === sha);
        return { kind: "photo", operationId: existingFile ? existingFile.operationId : crypto.randomUUID(), file };
      }));
      const permitFilesWithOp = await Promise.all(permitPhotos.map(async (file): Promise<DraftSaveFile> => {
        const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        const sha = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        const existingFile = confirmedMedia.find((m) => m.kind === "permit" && m.sha256 === sha);
        return { kind: "permit", operationId: existingFile ? existingFile.operationId : crypto.randomUUID(), file };
      }));
      const files: DraftSaveFile[] = [...photoFilesWithOp, ...permitFilesWithOp];
      const intent: DraftSaveIntent = {
        id: crypto.randomUUID(), ownerId: userId, operationId: crypto.randomUUID(),
        payload: createDraftPayload(values), values, files, createdAt: Date.now(),
        ...(draftId ? { draftId, revision } : {}),
      };
      const saved = await executeDraftSave(intent, repository);
      setDraftId(saved.draftId);
      setRevision(saved.revision);
      const nextConfirmed = await Promise.all(files.map(async (f) => {
        const digest = await crypto.subtle.digest("SHA-256", await f.file.arrayBuffer());
        const sha = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        return { operationId: f.operationId, sha256: sha, kind: f.kind };
      }));
      setConfirmedMedia(nextConfirmed);
      setSavedSnapshot({ payload: JSON.stringify(intent.payload), photos, permits: permitPhotos });
      // Refresh drafts list to get latest revision
      try {
        await loadDrafts();
      } catch {
        // list refresh is best-effort; the save succeeded
      }
      return { ...saved, message: files.length ? "Draft and files saved." : "Draft saved.", recovered: false };
    } catch {
      const message = "The save outcome could not be confirmed. Your entries were kept.";
      setNotice({ success: false, text: message });
      notify("error", "property-draft-save", message);
      return null;
    }
  }

  async function saveDraft() {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await persistDraft();
      if (!saved) return;
      setNotice({ success: true, text: saved.message });
      notify("success", "property-draft-save", saved.message);
    } finally { setSaving(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== steps.length - 1) { continueToNextStep(); return; }
    void submitListing();
  }

  async function submitListing() {
    if (saving) return;
    for (const index of [0, 1, 2, 3]) { if (!validateStep(index)) { setStep(index); return; } }
    setSaving(true);
    setDraftError("");
    let keepSaving = false;
    try {
      let activeDraftId = draftId;
      let activeRevision = revision;
      const currentPayload = JSON.stringify(createDraftPayload(currentValues()));
      const needsSave = !activeDraftId || !savedSnapshot || savedSnapshot.payload !== currentPayload || !sameFiles(savedSnapshot.photos, photos) || !sameFiles(savedSnapshot.permits, permitPhotos);
      if (needsSave) {
        // A new revision is about to be saved, so the previous submission attempt no longer applies.
        submissionOpRef.current = null;
        const saved = await persistDraft();
        if (!saved) return;
        if (saved.recovered) {
          setNotice({ success: true, text: saved.message });
          notify("success", "property-draft-save", saved.message);
          return;
        }
        activeDraftId = saved.draftId;
        activeRevision = saved.revision;
      }
      if (!activeDraftId) return;
      const storageKey = `abangcebu-submit-op:${userId}:${activeDraftId}:${activeRevision}`;
      if (!submissionOpRef.current) {
        try {
          const stored = sessionStorage.getItem(storageKey);
          if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) {
            submissionOpRef.current = stored;
          }
        } catch { /* ignore storage errors */ }
      }
      submissionOpRef.current ??= crypto.randomUUID();
      try { sessionStorage.setItem(storageKey, submissionOpRef.current); } catch { /* ignore storage errors */ }
      try {
        const res = await fetch("/api/landlord/properties", { method: "POST", headers: { "content-type": "application/json", "x-expected-user-id": userId }, body: JSON.stringify({ operationId: submissionOpRef.current, draftId: activeDraftId, expectedRevision: activeRevision }) });
        const data: { propertyId?: string; status?: string; error?: string; code?: string } | null = await res.json().catch(() => null);
        if (res.status === 409 && data?.code === "already_submitted") {
          // The server already holds this submission, so treat the retry as success instead of an error.
          submissionOpRef.current = null;
          try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
          setDraftError("");
          setDirty(false);
          notify("success", "property-submission", "Submission already received");
          keepSaving = true;
          if (router && typeof router.push === "function") router.push("/landlord/properties");
          else if (typeof window !== "undefined") window.history.pushState(null, "", "/landlord/properties");
          return;
        }
        if (!res.ok || !data?.propertyId) {
          if (res.status === 400 || res.status === 409) {
            submissionOpRef.current = null;
            try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
          }
          const errMsg = !res.ok && res.status < 500 ? (data?.error || "Submission failed. Please try again.") : "Submission could not be confirmed. Your draft was kept; retry when ready.";
          setDraftError(errMsg);
          notify("error", "property-submission", errMsg);
          return;
        }
        submissionOpRef.current = null;
        try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
        const statusText = `Listing submitted for review. Status: ${data.status ?? "pending"}.`;
        setNotice({ success: true, text: statusText });
        notify("success", "property-submission", statusText);
        setDirty(false);
        try { sessionStorage.removeItem(autosaveKey); } catch { /* storage blocked: nothing to clear */ }
        const targetUrl = restoreTarget ? "/landlord/properties" : `/landlord/map?selected=${encodeURIComponent(data.propertyId)}`;
        // Stay in the saving state until the destination route mounts; the form unmounts on navigation.
        keepSaving = true;
        if (router && typeof router.push === "function") router.push(targetUrl);
        else if (typeof window !== "undefined") window.history.pushState(null, "", targetUrl);
      } catch {
        const errMsg = "Submission could not be confirmed. Your draft was kept; retry when ready.";
        setDraftError(errMsg);
        notify("error", "property-submission", errMsg);
      }
    } finally { if (!keepSaving) setSaving(false); }
  }

  const selectedAmenities = review?.amenities ?? [];
  const price = Number(review?.price ?? "");
  const section = "grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6";
  const input = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return <form ref={formRef} noValidate onSubmit={submit} onChange={(event) => { if (event.target instanceof HTMLInputElement && event.target.type === "file" && event.target.name !== "permitPhotos") fileEdits.current++; setDirty(true); setFormEdits((count) => count + 1); }} className="grid scroll-mt-20 gap-4">
    {draftError && <p role="alert" className="m-0 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">{draftError}</p>}
    {drafts && drafts.length > 0 && <section aria-label="Saved drafts" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5">
      <div className="flex items-center gap-2"><FileText size={16} className="shrink-0 text-action" aria-hidden="true" /><h2 className="m-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved drafts</h2></div>
      <div className="flex flex-wrap gap-2">{drafts.map((draft) => {
        let title = "Untitled draft";
        try { title = restoreDraftValues(draft.payload).title || title; } catch { /* Keep unsupported drafts visible. */ }
        return <button type="button" className="min-h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" key={draft.id} onClick={() => restoreDraft(draft)}>Restore {title}</button>;
      })}</div>
    </section>}
    {notice && <p role={notice.success ? "status" : "alert"} className={notice.success ? "m-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-foreground" : "m-0 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground"}>{notice.text}</p>}

    <section className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5" aria-label="Listing progress">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold">Step {step + 1} of {steps.length}</span>
        <span className="text-right text-muted-foreground">{steps[step]}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Listing progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
        <div className="h-full rounded-full bg-action transition-[width] duration-200" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-3 grid grid-cols-5 gap-1.5 text-center text-xs sm:gap-2">
        {steps.map((label, index) => {
          const isCurrent = step === index;
          const isAccessible = index <= maxVisitedStep || index === step + 1;
          return (
            <li key={label} className="list-none">
              <button
                type="button"
                onClick={() => jumpToStep(index)}
                disabled={!isAccessible && index > step + 1}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${label}`}
                className={clsx(
                  "flex min-h-9 w-full items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 font-medium transition-colors",
                  isCurrent ? "bg-action/10 font-semibold text-action" : isAccessible ? "cursor-pointer text-foreground hover:bg-muted" : "cursor-not-allowed text-muted-foreground/60"
                )}
              >
                {index < step && <Check size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                <span className="sm:hidden">{index + 1}</span><span className="hidden truncate sm:inline">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>

    <div className="grid gap-4" data-step-panel="0" hidden={step !== 0} style={step === 0 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="property-details-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><MapPin size={19} aria-hidden="true" /></span><div><h2 id="property-details-heading" className="m-0 text-lg font-semibold">Property details</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Tell renters what makes your place a good fit.</p></div></div>
        <label className="grid gap-1.5 text-sm font-medium"><span>Property name</span><input className={input} name="title" required maxLength={200} placeholder="e.g. Mabolo Studio near IT Park" /></label>
        <label className="grid gap-1.5 text-sm font-medium"><span>Description</span><span className="text-xs font-normal text-muted-foreground">Minimum 20 characters describing layout, inclusions, and house rules.</span><textarea className="min-h-28 w-full rounded-lg border border-border bg-background p-3 text-sm font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" name="description" required minLength={20} maxLength={4000} placeholder="Describe the space, included features, and helpful renter details." /></label>
        <label className="grid gap-1.5 text-sm font-medium"><span>Property type</span><select className={input} name="propertyType" value={propertyType} required onChange={(event) => { const next = event.target.value; setPropertyType(next); const allowed = unitTypesByPropertyType[next] ?? allUnitTypes; const rental = formRef.current?.elements.namedItem("rentalType") as HTMLSelectElement | null; if (rental && allowed && !allowed.includes(rental.value)) rental.value = allowed[0]; }}><option value="" disabled>Select a property type</option>{propertyTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <fieldset className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold">First rental unit</legend>
          <p className="m-0 text-sm text-muted-foreground sm:col-span-2">Add the type and monthly rent for the first unit at this property.</p>
          <label className="grid gap-1.5 text-sm font-medium"><span>Unit type</span><select className={input} name="rentalType" value={rentalType} onChange={(e) => setRentalType(e.target.value)} required>{(unitTypesByPropertyType[propertyType] ?? allUnitTypes).map((value) => <option key={value} value={value}>{unitTypeLabels[value]}</option>)}<option value="" disabled>Select a unit type</option></select></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Monthly rent (PHP)</span><div className="relative flex items-center"><span className="pointer-events-none absolute left-3 text-sm font-semibold text-muted-foreground" aria-hidden="true">₱</span><input className={clsx(input, "pl-7")} name="price" type="number" min="1" max="10000000" step="1" required placeholder="e.g. 12000" /></div></label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2"><span>Tenant preference</span><select className={input} name="tenantPolicy" defaultValue="any"><option value="any">All / Anyone welcome</option><option value="female_only">Female only / Ladies only</option><option value="male_only">Male only</option><option value="mixed">Mixed / Co-ed</option></select></label>
          {rentalType === "entire_place" && (
            <div className="grid gap-4 border-t border-border/60 pt-2 sm:col-span-2 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                <span>Bedrooms</span>
                <select className={input} name="bedrooms" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
                  <option value="">Select bedrooms</option>
                  <option value="0">Studio / 0 BR</option>
                  <option value="1">1 bedroom</option>
                  <option value="2">2 bedrooms</option>
                  <option value="3">3 bedrooms</option>
                  <option value="4">4+ bedrooms</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                <span>Bathrooms</span>
                <select className={input} name="bathrooms" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)}>
                  <option value="">Select bathrooms</option>
                  <option value="1">1 bathroom</option>
                  <option value="2">2 bathrooms</option>
                  <option value="3">3+ bathrooms</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                <span>Floor area (sqm)</span>
                <input className={input} name="floorAreaSqm" type="number" min="1" max="9999" placeholder="e.g. 45" value={floorAreaSqm} onChange={(e) => setFloorAreaSqm(e.target.value)} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                <span>Furnishing</span>
                <select className={input} name="furnishedStatus" value={furnishedStatus} onChange={(e) => setFurnishedStatus(e.target.value)}>
                  <option value="">Select furnishing</option>
                  <option value="unfurnished">Unfurnished</option>
                  <option value="semi_furnished">Semi-furnished</option>
                  <option value="furnished">Fully furnished</option>
                </select>
              </label>
            </div>
          )}
        </fieldset>
      </section>
    </div>

    <div className="grid gap-4" data-step-panel="1" hidden={step !== 1} style={step === 1 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="property-location-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><MapPin size={19} aria-hidden="true" /></span><div><h2 id="property-location-heading" className="m-0 text-lg font-semibold">Address and map location</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Select the property location, then confirm its full address.</p></div></div>
        {isLocationLocked && (
          <div role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
            <strong className="font-semibold">Approved location locked:</strong> This listing is already published. Street address, barangay, city, and map pin are locked and can only be corrected by an Administrator.
          </div>
        )}
        <div className="grid gap-1.5 text-sm font-medium"><span>Find the location</span><MapSearch embedded className="!relative !top-auto !left-auto !z-[4] !w-full" disabled={isLocationLocked} onSelect={(place) => { if (!isLocationLocked) void choosePin(place.coordinates, place); }} /></div>
        {step === 1 && <div className="relative h-80 overflow-hidden rounded-xl"><MapCanvasLoader locationPicker selectedPlace={location} resolvedTheme={resolvedTheme} enablePinDrop={!isLocationLocked} pinCoordinates={location?.coordinates} onPinChange={(coordinates) => { if (!isLocationLocked) void choosePin(coordinates); }} /></div>}
        {location && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5"><p className="m-0 flex items-center gap-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-300"><Check size={16} aria-hidden="true" /> Selected: {[location.name, location.detail].filter(Boolean).join(", ")}</p>{!isLocationLocked && <button type="button" className="min-h-9 rounded-lg px-2.5 text-xs font-semibold text-emerald-800 underline hover:bg-emerald-500/20 dark:text-emerald-300" onClick={() => { locationRequest.current++; clearAutomaticLocation(); setLocation(null); setDirty(true); }}>Clear pin</button>}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2"><span>Complete property address</span><input className={clsx(input, isLocationLocked && "cursor-not-allowed bg-muted/50 text-muted-foreground")} name="address" value={address} readOnly={isLocationLocked} onChange={(event) => { if (!isLocationLocked) { manuallyEdited.current.address = true; setAddress(event.target.value); } }} required maxLength={1000} placeholder="House/building, street, barangay" /></label>
        <label className="grid gap-1.5 text-sm font-medium"><span>Barangay</span><input className={clsx(input, isLocationLocked && "cursor-not-allowed bg-muted/50 text-muted-foreground")} name="barangay" readOnly={isLocationLocked} onChange={() => { if (!isLocationLocked) manuallyEdited.current.barangay = true; }} required maxLength={200} placeholder="Enter barangay" /></label>
        <label className="grid gap-1.5 text-sm font-medium"><span>City or municipality</span><input className={clsx(input, isLocationLocked && "cursor-not-allowed bg-muted/50 text-muted-foreground")} name="city" readOnly={isLocationLocked} onChange={() => { if (!isLocationLocked) manuallyEdited.current.city = true; }} required maxLength={200} defaultValue="Cebu City" /></label>
        </div>
      </section>
    </div>

    <div className="grid gap-4" data-step-panel="2" hidden={step !== 2} style={step === 2 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="property-amenities-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><Check size={19} aria-hidden="true" /></span><div><h2 id="property-amenities-heading" className="m-0 text-lg font-semibold">Amenities and details</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Select the amenities available to renters.</p></div></div>
        <fieldset className="grid gap-2 border-0 p-0 sm:grid-cols-2"><legend className="mb-2 text-sm font-medium">Amenities</legend>{amenities.map(([value, label]) => <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background px-3 text-sm transition-colors hover:bg-muted/40 has-[:checked]:border-action has-[:checked]:bg-action/5 has-[:checked]:font-medium" key={value}><input className="size-4 accent-action" type="checkbox" name="amenities" value={value} /><span>{label}</span></label>)}</fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium"><span>Bathroom</span><select className={input} name="bathroomType" defaultValue=""><option value="">Not specified</option><option value="private">Private</option><option value="shared">Shared</option></select></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Maximum occupants</span><input className={input} name="maxOccupants" type="number" min="1" max="1000" placeholder="Optional" /></label>
        </div>
      </section>
      <section className={section} aria-labelledby="property-photos-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><ImagePlus size={19} aria-hidden="true" /></span><div><h2 id="property-photos-heading" className="m-0 text-lg font-semibold">Property photos</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Optional: up to 6 JPG, PNG, or WebP photos, 10 MB each.</p></div></div>
        <div className="grid gap-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingPhotos(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingPhotos(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingPhotos(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingPhotos(false);
              const dropped = Array.from(e.dataTransfer?.files ?? []);
              const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
              const hasInvalidType = dropped.some((file) => file.type && !ALLOWED_TYPES.has(file.type));
              const hasInvalidSize = dropped.some((file) => file.size === 0 || file.size > 10 * 1024 * 1024);
              const all = [...photos, ...dropped];
              if (!dropped.length || all.length > 6 || hasInvalidType || hasInvalidSize) {
                setNotice({ success: false, text: "Choose up to 6 photos, each no larger than 10 MB. Your previous selection was kept." });
                return;
              }
              fileEdits.current++;
              setPhotos(all);
              setDirty(true);
              setNotice(null);
            }}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
              isDraggingPhotos
                ? "border-action bg-action/10 ring-2 ring-action/20"
                : "border-border/80 bg-card/60 hover:border-action/60 hover:bg-muted/30"
            }`}
            aria-label="Drag and drop photo upload area"
          >
            <label className="flex cursor-pointer flex-col items-center gap-2">
              <div className="grid size-12 place-items-center rounded-xl bg-action/10 text-action">
                <Upload size={22} aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <p className="m-0 text-sm font-semibold text-foreground">
                  <span className="text-action underline underline-offset-2">Click to browse</span> or drag and drop photos here
                </p>
                <p className="m-0 text-xs text-muted-foreground">JPG, PNG, or WebP up to 10 MB each (max 6 photos)</p>
              </div>
              <input
                className="sr-only"
                name="propertyPhotos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  const next = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
                  const hasInvalidType = next.some((file) => file.type && !ALLOWED_TYPES.has(file.type));
                  const hasInvalidSize = next.some((file) => file.size === 0 || file.size > 10 * 1024 * 1024);
                  const all = [...photos, ...next];
                  if (!next.length || all.length > 6 || hasInvalidType || hasInvalidSize) {
                    setNotice({ success: false, text: "Choose up to 6 photos, each no larger than 10 MB. Your previous selection was kept." });
                    return;
                  }
                  fileEdits.current++;
                  setPhotos(all);
                  setDirty(true);
                  setNotice(null);
                }}
              />
            </label>
          </div>
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6" aria-label="Selected property photos">
              {photos.map((photo, index) => (
                <div key={`${photo.name}-${index}`} className="group relative flex flex-col items-center overflow-hidden rounded-xl border border-border bg-card p-2">
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                    <PermitThumbnail file={photo} className="size-full object-cover" />
                    {index === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-action px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-action-foreground shadow-xs">Cover photo</span>}
                  </div>
                  <span className="mt-1.5 w-full truncate text-center text-xs text-muted-foreground">{photo.name}</span>
                  <span className="text-[11px] text-muted-foreground">{fileSize(photo.size)}</span>
                  <button
                    type="button"
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-border/80 px-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    aria-label={`Remove ${photo.name}`}
                    onClick={() => {
                      fileEdits.current++;
                      setDirty(true);
                      setPhotos((current) => current.filter((_, i) => i !== index));
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>

    <div className="grid gap-4" data-step-panel="3" hidden={step !== 3} style={step === 3 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="business-permit-heading">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><FileText size={19} aria-hidden="true" /></span>
          <div>
            <h2 id="business-permit-heading" className="m-0 text-lg font-semibold">Business permit & certification</h2>
            <p className="mb-0 mt-1 text-sm text-muted-foreground">Upload documents that verify your rental operation. Permit files stay private.</p>
          </div>
        </div>
        <p className="m-0 text-xs text-muted-foreground">Accepted: Mayor’s Permit, Barangay Clearance, Fire Safety (FSIC), Sanitary Permit, or Tax Declaration / Deed (PDF, JPG, PNG, WebP up to 10 MB each, max 5 files).</p>
        {(() => {
          const guidance = getCityGuidance(city);
          return (
            <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs text-muted-foreground">
              <p className="m-0 font-semibold text-foreground">{guidance.cityName} verification guidance</p>
              <p className="mb-0 mt-1 leading-relaxed">{guidance.text}</p>
            </div>
          );
        })()}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingPermits(true); }}
          onDragEnter={(e) => { e.preventDefault(); setIsDraggingPermits(true); }}
          onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDraggingPermits(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDraggingPermits(false); void selectPermitPhotos(Array.from(e.dataTransfer?.files ?? [])); }}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition focus-within:ring-2 focus-within:ring-action/40 ${
            isDraggingPermits ? "border-action bg-action/10 ring-2 ring-action/20" : "border-border/80 bg-card/60 hover:border-action/60 hover:bg-muted/30"
          }`}
          aria-label="Drag and drop permit upload area"
        >
          <label className="flex cursor-pointer flex-col items-center gap-2">
            <div className="grid size-12 place-items-center rounded-xl bg-action/10 text-action"><Upload size={22} aria-hidden="true" /></div>
            <div className="space-y-0.5">
              <p className="m-0 text-sm font-semibold text-foreground"><span className="text-action underline underline-offset-2">Click to browse</span> or drag and drop permit files here</p>
              <p className="m-0 text-xs text-muted-foreground">PDF, JPG, PNG, or WebP up to 10 MB each (max 5 files)</p>
            </div>
            <input className="sr-only" name="permitPhotos" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple aria-describedby={permitError ? "permit-upload-error" : undefined} onChange={(event) => { const input = event.currentTarget; const files = Array.from(input.files ?? []); input.value = ""; void selectPermitPhotos(files); }} />
          </label>
        </div>
        {permitError && <p id="permit-upload-error" role="alert" className="m-0 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">{permitError}</p>}
        {permitPhotos.length > 0 && (
          <ul className="m-0 grid min-w-0 list-none gap-2 p-0 sm:grid-cols-2" aria-label="Selected permit files">
            {permitPhotos.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {file.type.startsWith("image/") ? <PermitThumbnail file={file} className="size-12 shrink-0 rounded object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded bg-muted text-muted-foreground"><FileText size={22} aria-hidden="true" /></span>}
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{file.name}</span>
                    <span className="block text-xs text-muted-foreground">{fileSize(file.size)} · {savedSnapshot?.permits.includes(file) ? "Saved" : saving ? "Uploading…" : "Not saved yet"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <select
                    aria-label={`Category for ${file.name}`}
                    value={documentCategories[file.name] ?? "mayors_permit"}
                    onChange={(e) => {
                      const next = e.target.value;
                      setDocumentCategories((prev) => ({ ...prev, [file.name]: next }));
                      setDirty(true);
                    }}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs font-normal text-foreground"
                  >
                    <option value="mayors_permit">Business / Mayor&apos;s Permit</option>
                    <option value="barangay_clearance">Barangay Clearance</option>
                    <option value="fire_sanitary">Fire Safety (FSIC) / Sanitary</option>
                    <option value="ownership_title">Ownership Title / Tax Dec</option>
                    <option value="other_verification">Other Verification</option>
                  </select>
                  <label className="inline-flex min-h-8 cursor-pointer items-center rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground hover:bg-muted" aria-label={`Replace ${file.name}`}>
                    Replace
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const rep = event.target.files?.[0];
                        event.target.value = "";
                        if (!rep) return;
                        if (rep.size === 0 || rep.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(rep.type)) {
                          setPermitError("Replacement file must be a JPG, PNG, WebP or PDF up to 10 MB.");
                          return;
                        }
                        fileEdits.current++;
                        setPermitPhotos((prev) => {
                          const copy = [...prev];
                          copy[index] = rep;
                          return copy;
                        });
                        if (documentCategories[file.name]) {
                          setDocumentCategories((prev) => {
                            const next = { ...prev, [rep.name]: prev[file.name] };
                            delete next[file.name];
                            return next;
                          });
                        }
                        setDirty(true);
                        setPermitError("");
                      }}
                    />
                  </label>
                  <button type="button" className="min-h-8 shrink-0 rounded px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10" aria-label={`Remove ${file.name}`} onClick={() => { fileEdits.current++; setDirty(true); setPermitError(""); setPermitPhotos((files) => files.filter((_, i) => i !== index)); }}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3.5 text-sm leading-relaxed transition-colors hover:bg-muted/50 has-[:checked]:border-action has-[:checked]:bg-action/5">
          <input className="mt-1 size-4 shrink-0 accent-action" type="checkbox" name="permitNotRequiredConfirmed" value="yes" checked={permitNotRequiredConfirmed} onChange={(event) => { if (preservedDraftValues.current) preservedDraftValues.current.emptyPermitConfirmation = false; setPermitNotRequiredConfirmed(event.target.checked); setNotice(null); }} />
          <span>This property is an individual residential room, house, or condo exempt from commercial business permits.</span>
        </label>
        <div className="grid gap-1.5 pt-1">
          <label className="grid gap-1 text-xs font-medium text-foreground">
            <span>Unavailable document explanation or exemption details</span>
            <textarea
              className="min-h-20 w-full rounded-xl border border-border bg-background p-3 text-xs font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              name="permitExemptionReason"
              maxLength={1000}
              value={permitExemptionReason}
              onChange={(e) => {
                setPermitExemptionReason(e.target.value);
                setDirty(true);
              }}
              placeholder="Optional: Explain why any specific document is unavailable, pending renewal, or exempt (e.g. Individual homeowner renting one bedroom, commercial permit exempt under local ordinance)."
            />
          </label>
        </div>
      </section>
    </div>

    <div className="grid gap-4" data-step-panel="4" hidden={step !== 4} style={step === 4 ? undefined : { display: "none" }}>
      <section className={section} aria-labelledby="listing-review-heading">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-action"><Check size={19} aria-hidden="true" /></span><div><h2 id="listing-review-heading" className="m-0 text-lg font-semibold">Review your listing</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">Check the details before sending your property for review.</p></div></div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3"><div className="flex items-center justify-between gap-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property</dt><button type="button" className="text-xs font-semibold text-action hover:underline" aria-label="Edit property details" onClick={() => jumpToStep(0)}>Edit</button></div><dd className="mb-0 mt-1 font-semibold">{review?.title || "Not provided"}</dd><dd className="mb-0 mt-1 text-sm text-muted-foreground">{propertyTypes.find(([value]) => value === review?.propertyType)?.[1] ?? "Type not selected"} · {({ entire_place: "Entire place", private_room: "Private room", shared_room: "Shared room", bedspace: "Bedspace" } as Record<string, string>)[review?.rentalType ?? ""] ?? "Unit type not selected"}</dd></div>
          <div className="rounded-xl border border-border p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly rent</dt><dd className="mb-0 mt-1 font-semibold">{price > 0 ? `₱${price.toLocaleString("en-PH")}` : "Not provided"}</dd></div>
          <div className="rounded-xl border border-border p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tenant preference</dt><dd className="mb-0 mt-1 text-sm">{review?.tenantPolicy === "female_only" ? "Female only / Ladies only" : review?.tenantPolicy === "male_only" ? "Male only" : review?.tenantPolicy === "mixed" ? "Mixed / Co-ed" : "All / Anyone welcome"}</dd></div>
          <div className="rounded-xl border border-border p-3"><div className="flex items-center justify-between gap-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business permit</dt><button type="button" className="text-xs font-semibold text-action hover:underline" aria-label="Edit business permit" onClick={() => jumpToStep(3)}>Edit</button></div><dd className="mb-0 mt-1 text-sm">{permitPhotos.length > 0 ? `Required · ${permitPhotos.length} file${permitPhotos.length === 1 ? "" : "s"}: ${permitPhotos.map((file) => file.name).join(", ")}` : "Declared not required"}</dd></div>
          <div className="rounded-xl border border-border p-3 sm:col-span-2"><div className="flex items-center justify-between gap-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</dt><button type="button" className="text-xs font-semibold text-action hover:underline" aria-label="Edit location" onClick={() => jumpToStep(1)}>Edit</button></div><dd className="mb-0 mt-1 font-medium">{address || "Address not provided"}</dd><dd className="mb-0 mt-1 text-sm text-muted-foreground">{[review?.barangay, review?.city].filter(Boolean).join(", ")}</dd></div>
          <div className="rounded-xl border border-border p-3 sm:col-span-2"><div className="flex items-center justify-between gap-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amenities</dt><button type="button" className="text-xs font-semibold text-action hover:underline" aria-label="Edit amenities and photos" onClick={() => jumpToStep(2)}>Edit</button></div><dd className="mb-0 mt-1 text-sm">{selectedAmenities.length ? selectedAmenities.join(", ") : "No amenities selected"}</dd></div>
          <div className="rounded-xl border border-border p-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Photos</dt><dd className="mb-0 mt-1 text-sm">{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected` : "No photos added"}{photos.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{photos.map((photo, index) => <PermitThumbnail key={`${photo.name}-${index}`} file={photo} className="size-12 rounded-lg border border-border object-cover" />)}</div>}</dd></div>
          {review?.description && <div className="rounded-xl border border-border p-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</dt><dd className="mb-0 mt-1 whitespace-pre-wrap text-sm">{review.description}</dd></div>}
        </dl>
        {isLocationLocked && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs leading-relaxed text-emerald-950 dark:text-emerald-200">
            <strong className="font-semibold">Your published listing stays live:</strong> Renters will continue to view your currently active listing on the map. Once an administrator approves this revision, your changes will automatically update on the live listing.
          </div>
        )}
        <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs leading-relaxed text-muted-foreground"><strong className="font-semibold text-foreground">What happens next:</strong> Submitted listings enter <span className="font-semibold text-foreground">pending review</span>. Once verified by an administrator, your property will appear on the public rental map. Uploaded permit documents remain private.</div>
      </section>
    </div>

    <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] lg:bottom-0 z-20 -mx-1 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-4 sm:pb-4">
      <p className="m-0 hidden text-sm text-muted-foreground sm:block sm:text-left">{step === steps.length - 1 ? "Review & submit" : `${steps.length - step - 1} step${steps.length - step - 1 === 1 ? "" : "s"} remaining`}{saving ? " · Saving…" : dirty ? " · Unsaved changes" : ""}</p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        {step > 0 && <button className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50" type="button" onClick={() => { setNotice(null); setStep((current) => Math.max(0, current - 1)); formRef.current?.scrollIntoView({ block: "start" }); }} disabled={step === 0 || pending}><ChevronLeft size={17} aria-hidden="true" /> Back</button>}
        <button className={clsx("inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50", step === 0 && "col-span-2 sm:col-span-1")} type="button" onClick={() => { void saveDraft(); }} disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>
        {step < steps.length - 1
          ? <button className="col-span-2 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action-hover disabled:opacity-60 sm:col-span-1 sm:w-auto" type="button" onClick={continueToNextStep} disabled={pending}>Continue <ChevronRight size={17} aria-hidden="true" /></button>
          : <button className="col-span-2 min-h-11 w-full rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action-hover disabled:opacity-60 sm:col-span-1 sm:w-auto" type="button" onClick={() => { void submitListing(); }} disabled={saving}>Submit listing for review</button>}
      </div>
    </div>
  </form>;
}