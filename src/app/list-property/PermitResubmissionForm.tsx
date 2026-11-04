"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

type Applicability = "required" | "not_required" | "unknown";

export function PermitResubmissionForm({ listingId, applicability }: { listingId: string; applicability: Applicability }) {
  const router = useRouter();
  const [selected, setSelected] = useState<"required" | "not_required" | "">(applicability === "unknown" ? "" : applicability);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("permitApplicability", selected);
    data.set("listingId", listingId);
    setPending(true);
    try {
      const response = await fetch("/api/landlord/listings", { method: "POST", body: data });
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("success" in payload) || payload.success !== true) {
        const reason = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "The permit details could not be updated.";
        throw new Error(reason);
      }
      setNotice("Updated. Your permit information is pending review.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The permit details could not be updated.");
    } finally {
      setPending(false);
    }
  }

  const input = "min-h-10 rounded-lg border border-border bg-card px-3 text-sm font-normal";
  return <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-border bg-muted/30 p-3">
    <p className="m-0 text-sm font-semibold">Update permit information</p>
    <label className="grid gap-1.5 text-sm font-medium"><span>Does this rental require a business permit?</span><select className={input} value={selected} onChange={(event) => setSelected(event.target.value as "required" | "not_required" | "")} required><option value="" disabled>Select the applicable option</option><option value="required">Yes, a permit is required</option><option value="not_required">No, a permit is not required</option></select></label>
    {selected === "required" && <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium"><span>Permit number</span><input className={input} name="permitNumber" required maxLength={100} placeholder="As shown on the permit" /></label>
      <label className="grid gap-1.5 text-sm font-medium"><span>Issuing city or municipality</span><input className={input} name="permitLgu" required maxLength={200} placeholder="e.g. Cebu City" /></label>
      <label className="grid gap-1.5 text-sm font-medium"><span>Valid through</span><input className={input} name="permitExpiresOn" type="date" required /></label>
      <label className="relative grid min-h-10 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold sm:mt-6"><span className="inline-flex items-center gap-2"><Upload size={16} aria-hidden="true" /> Choose current permit</span><input className="absolute inset-0 h-full w-full cursor-pointer opacity-0" name="permitDocument" type="file" accept="application/pdf,image/jpeg,image/png" required /></label>
      <p className="m-0 text-xs text-muted-foreground sm:col-span-2">PDF, JPG, or PNG, up to 10 MB.</p>
    </div>}
    {selected === "not_required" && <label className="flex items-start gap-2 text-sm leading-relaxed"><input className="mt-1 size-4 shrink-0 accent-blue-600" type="checkbox" name="permitNotRequiredConfirmed" value="yes" required /><span>I checked the requirements for this property’s location and rental activity and confirm a business permit is not required.</span></label>}
    {notice && <p className="m-0 text-sm text-muted-foreground" role="status">{notice}</p>}
    <button className="min-h-10 w-fit rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground disabled:opacity-60" type="submit" disabled={pending}>{pending ? "Submitting…" : "Update permit details"}</button>
  </form>;
}
