"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function reviewListing(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fadmin%2Flistings");
  const { data: profile } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.is_suspended) redirect("/");

  const listingId = formData.get("listingId");
  const decision = formData.get("decision");
  const rawReason = formData.get("reason");
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";
  if (typeof listingId !== "string" || !/^[0-9a-f-]{36}$/i.test(listingId) || (decision !== "approve" && decision !== "reject")) redirect("/admin/listings?error=invalid");
  if (decision === "reject" && (reason.length < 10 || reason.length > 500)) redirect("/admin/listings?error=reason");

  const { data: reviewed, error } = await supabase.rpc("review_landlord_listing", { listing_id: listingId, decision, reason: decision === "reject" ? reason : null });
  if (error || reviewed !== true) redirect("/admin/listings?error=stale");
  revalidatePath("/admin/listings");
  revalidatePath("/list-property");
  revalidatePath("/");
  redirect("/admin/listings?success=" + decision);
}

export async function reviewListingPermit(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fadmin%2Flistings");
  const { data: profile } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.is_suspended) redirect("/");

  const listingId = formData.get("listingId");
  const decision = formData.get("permitDecision");
  const rawReason = formData.get("permitReason");
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";
  if (typeof listingId !== "string" || !/^[0-9a-f-]{36}$/i.test(listingId) || (decision !== "approve" && decision !== "reject")) redirect("/admin/listings?error=permit_invalid");
  if (decision === "reject" && (reason.length < 10 || reason.length > 500)) redirect("/admin/listings?error=permit_reason");

  const { data: reviewed, error } = await supabase.rpc("review_landlord_listing_permit", {
    listing_id: listingId,
    decision,
    reason: decision === "reject" ? reason : null,
  });
  if (error || reviewed !== true) redirect("/admin/listings?error=permit_stale");
  revalidatePath("/admin/listings");
  revalidatePath("/list-property");
  redirect("/admin/listings?success=permit_" + decision);
}
