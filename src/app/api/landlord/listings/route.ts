import { PLACE_BOUNDS } from "@/lib/search/places";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const propertyTypes = new Set(["bedspace", "boarding_house", "private_room", "shared_room", "studio", "apartment", "condo", "house"]);
const amenityKeys = new Set(["wifi", "aircon", "cooking", "laundry", "water_included", "electricity_included", "motorcycle_parking", "car_parking"]);

function textField(form: FormData, key: string, max: number) {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}
function numberField(form: FormData, key: string, min: number, max: number) {
  const raw = form.get(key);
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}
function isCurrentDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  const todayInPhilippines = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value >= todayInPhilippines;
}
async function hasValidPermitSignature(file: File) {
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (file.type === "application/pdf") return String.fromCharCode(...header.slice(0, 5)) === "%PDF-";
  if (file.type === "image/jpeg") return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (file.type === "image/png") return header.length === 8 && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47 && header[4] === 0x0d && header[5] === 0x0a && header[6] === 0x1a && header[7] === 0x0a;
  return false;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Sign in with a landlord account to submit a property." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profile?.role !== "landlord" || profile.is_suspended) return Response.json({ error: "Only active landlord accounts can submit properties." }, { status: 403 });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return Response.json({ error: "The property form could not be read. Please try again." }, { status: 400 }); }

  const permitUpdateListingId = form.get("listingId");
  if (typeof permitUpdateListingId === "string") {
    if (!/^[0-9a-f-]{36}$/i.test(permitUpdateListingId)) return Response.json({ error: "That property could not be found." }, { status: 404 });
    const applicability = form.get("permitApplicability");
    const permitNumber = textField(form, "permitNumber", 100);
    const permitLgu = textField(form, "permitLgu", 200);
    const expiresOn = textField(form, "permitExpiresOn", 10);
    const fileValue = form.get("permitDocument");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
    if (applicability !== "required" && applicability !== "not_required") {
      return Response.json({ error: "Select whether this rental requires a local business permit." }, { status: 400 });
    }
    if (applicability === "required") {
      if (!file || !permitNumber || !permitLgu || !isCurrentDate(expiresOn)) return Response.json({ error: "Add the current permit, permit number, issuing city or municipality, and a valid expiration date." }, { status: 400 });
      if (file.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(file.type) || !(await hasValidPermitSignature(file))) {
        return Response.json({ error: "Upload a PDF, JPG, or PNG permit file no larger than 10 MB." }, { status: 400 });
      }
    } else if (file || form.get("permitNotRequiredConfirmed") !== "yes") {
      return Response.json({ error: "Confirm that a business permit is not required for this rental." }, { status: 400 });
    }

    const { data: listing, error: listingError } = await supabase.from("listings")
      .select("id,status,submitted_at,reviewed_at").eq("id", permitUpdateListingId).eq("owner_id", user.id).maybeSingle();
    const draftNeedsPermitUpdate = listing?.status === "draft" && Boolean(listing.submitted_at) && !listing.reviewed_at;
    const publishedPermitRenewal = listing?.status === "published" && Boolean(listing.submitted_at) && Boolean(listing.reviewed_at);
    if (listingError || !listing || (!draftNeedsPermitUpdate && !publishedPermitRenewal)) {
      return Response.json({ error: "This property is no longer accepting permit updates." }, { status: 409 });
    }
    const { data: existing, error: permitError } = await supabase.from("listing_permit_reviews")
      .select("applicability,status,document_path,expires_on").eq("listing_id", permitUpdateListingId).eq("owner_id", user.id).maybeSingle();
    const todayInPhilippines = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    const expiredPermitRenewal = Boolean(publishedPermitRenewal && existing?.status === "approved" && existing.applicability === "required" && existing.expires_on && existing.expires_on < todayInPhilippines);
    if (permitError || !existing || !(existing.status === "rejected" || (existing.status === "pending" && existing.applicability === "unknown") || expiredPermitRenewal)) {
      return Response.json({ error: "Permit information can only be updated after a review rejection, for an older submission awaiting applicability details, or when an approved permit has expired." }, { status: 409 });
    }

    const documentPath = user.id + "/" + permitUpdateListingId + "/business-permit";
    if (applicability === "required" && file) {
      const { error } = await supabase.storage.from("listing-permits").upload(documentPath, file, { contentType: file.type, upsert: Boolean(existing.document_path) });
      if (error) return Response.json({ error: "The permit file could not be uploaded. Check your connection and try again." }, { status: 503 });
    } else if (existing.document_path) {
      const { error } = await supabase.storage.from("listing-permits").remove([existing.document_path]);
      if (error) return Response.json({ error: "The previous permit file could not be replaced. Please try again." }, { status: 503 });
    }

    const { data: updatedPermit, error: updateError } = await supabase.from("listing_permit_reviews").update({
      applicability,
      document_path: applicability === "required" ? documentPath : null,
      permit_number: applicability === "required" ? permitNumber : null,
      issuing_lgu: applicability === "required" ? permitLgu : null,
      expires_on: applicability === "required" ? expiresOn : null,
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
    }).eq("listing_id", permitUpdateListingId).eq("owner_id", user.id).select("listing_id").maybeSingle();
    if (updateError || !updatedPermit) return Response.json({ error: "Your permit information was uploaded but could not be sent for review. Please try again." }, { status: 503 });
    return Response.json({ success: true, message: "Your permit information is pending review." });
  }

  const title = textField(form, "title", 200);
  const description = textField(form, "description", 4000);
  const address = textField(form, "address", 1000);
  const city = textField(form, "city", 200);
  const propertyType = textField(form, "propertyType", 40);
  const price = numberField(form, "price", 1, 10000000);
  const latitude = numberField(form, "latitude", PLACE_BOUNDS.south, PLACE_BOUNDS.north);
  const longitude = numberField(form, "longitude", PLACE_BOUNDS.west, PLACE_BOUNDS.east);
  const bathroom = form.get("bathroomType");
  const permitApplicability = form.get("permitApplicability");
  const permitNumber = textField(form, "permitNumber", 100);
  const permitLgu = textField(form, "permitLgu", 200);
  const permitExpiresOn = textField(form, "permitExpiresOn", 10);
  const permitFileValue = form.get("permitDocument");
  const permitFile = permitFileValue instanceof File && permitFileValue.size > 0 ? permitFileValue : null;
  const rawOccupants = form.get("maxOccupants");
  const maxOccupants = rawOccupants === "" ? null : numberField(form, "maxOccupants", 1, 1000);
  const amenities = new Set(form.getAll("amenities").filter((value): value is string => typeof value === "string"));
  const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);

  if (!title || !description || description.length < 20 || !address || !city || !price || !propertyType || !propertyTypes.has(propertyType) ||
      latitude === null || longitude === null || (rawOccupants !== "" && maxOccupants === null) ||
      (bathroom !== "" && bathroom !== "private" && bathroom !== "shared")) {
    return Response.json({ error: "Complete the required fields and choose a valid Cebu map location." }, { status: 400 });
  }
  if (permitApplicability !== "required" && permitApplicability !== "not_required") {
    return Response.json({ error: "Select whether this rental requires a local business permit." }, { status: 400 });
  }
  if (permitApplicability === "required") {
    if (!permitFile || !permitNumber || !permitLgu || !isCurrentDate(permitExpiresOn)) {
      return Response.json({ error: "Add the current permit, permit number, issuing city or municipality, and a valid expiration date." }, { status: 400 });
    }
    if (permitFile.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(permitFile.type) || !(await hasValidPermitSignature(permitFile))) {
      return Response.json({ error: "Upload a PDF, JPG, or PNG permit file no larger than 10 MB." }, { status: 400 });
    }
  } else if (permitFile || form.get("permitNotRequiredConfirmed") !== "yes") {
    return Response.json({ error: "Confirm that a business permit is not required for this rental." }, { status: 400 });
  }
  if (photos.length > 6 || photos.some((file) => file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
    return Response.json({ error: "Add up to 6 JPG, PNG, or WebP photos. Each photo must be 10 MB or smaller." }, { status: 400 });
  }
  if ([...amenities].some((key) => !amenityKeys.has(key))) return Response.json({ error: "One of the selected amenities is not supported." }, { status: 400 });

  const uploaded: string[] = [];
  let uploadedPermitPath: string | null = null;
  let listingId: string | null = null;
  try {
    const imageUrls: string[] = [];
    for (const file of photos) {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = user.id + "/" + crypto.randomUUID() + "." + extension;
      const { error } = await supabase.storage.from("property-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error("A property photo could not be uploaded. Check your connection and try again.");
      uploaded.push(path);
      imageUrls.push(supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl);
    }

    const { data: listing, error: insertError } = await supabase.from("listings").insert({
      title, description, price, currency: "PHP", rental_period: "monthly", property_type: propertyType,
      latitude, longitude, address, city, is_available: true, owner_id: user.id, image_urls: imageUrls,
      max_occupants: maxOccupants, bathroom_type: bathroom === "" ? null : bathroom,
      cooking_allowed: amenities.has("cooking"), laundry_allowed: amenities.has("laundry"),
      wifi_available: amenities.has("wifi"), aircon: amenities.has("aircon"),
      water_included: amenities.has("water_included"), electricity_included: amenities.has("electricity_included"),
      motorcycle_parking: amenities.has("motorcycle_parking"), car_parking: amenities.has("car_parking"),
    }).select("id").single();
    if (insertError || !listing) throw new Error("Your property could not be saved. Please try again.");
    listingId = listing.id;

    let permitPath: string | null = null;
    if (permitApplicability === "required" && permitFile) {
      permitPath = user.id + "/" + listing.id + "/business-permit";
      const { error: permitUploadError } = await supabase.storage.from("listing-permits").upload(permitPath, permitFile, { contentType: permitFile.type, upsert: false });
      if (permitUploadError) throw new Error("The business permit could not be uploaded. Apply the listing permit migration and try again.");
      uploadedPermitPath = permitPath;
    }
    const { error: permitInsertError } = await supabase.from("listing_permit_reviews").insert({
      listing_id: listing.id,
      owner_id: user.id,
      applicability: permitApplicability,
      document_path: permitPath,
      permit_number: permitApplicability === "required" ? permitNumber : null,
      issuing_lgu: permitApplicability === "required" ? permitLgu : null,
      expires_on: permitApplicability === "required" ? permitExpiresOn : null,
    });
    if (permitInsertError) throw new Error("Your property was saved but its permit details could not be submitted. Apply the listing permit migration and try again.");

    const { data: submitted, error: submitError } = await supabase.rpc("submit_landlord_listing", { listing_id: listing.id });
    if (submitError || submitted !== true) throw new Error("Your property was saved but could not be sent for review. Please retry or contact support.");
    return Response.json({ success: true, message: "Your property was submitted for review. It will appear in renter search after an admin approves it." }, { status: 201 });
  } catch (error) {
    let preservePhotos = false;
    if (listingId) {
      const { data: removed, error: removalError } = await supabase.from("listings").delete().eq("id", listingId).eq("owner_id", user.id).select("id");
      preservePhotos = Boolean(removalError || !removed?.length);
    }
    if (uploaded.length && !preservePhotos) await supabase.storage.from("property-images").remove(uploaded);
    if (uploadedPermitPath && !preservePhotos) await supabase.storage.from("listing-permits").remove([uploadedPermitPath]);
    const message = preservePhotos
      ? "We could not confirm the review handoff. Your property was kept; check Your submissions before trying again."
      : error instanceof Error ? error.message : "Your property could not be submitted.";
    return Response.json({ error: message }, { status: 503 });
  }
}
