"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, MapPinned } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";

export type SubmittedPropertyItem = {
  id: string;
  title: string | null;
  status: string;
  street_address?: string | null;
  city?: string | null;
  property_type?: string | null;
  monthly_rent?: number | null;
};

export type LandlordSubmissionsListProps = {
  submissions: SubmittedPropertyItem[];
  availableIds: string[];
  feedback: Record<string, string>;
  correctionTargets: Record<string, { draftId: string; revision: number }>;
  linkClass: string;
  pageSize?: number;
};

const statusTone: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  live: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const metaLine = (p: SubmittedPropertyItem) =>
  [[p.street_address, p.city].filter(Boolean).join(", "), p.property_type, typeof p.monthly_rent === "number" ? `₱${p.monthly_rent.toLocaleString("en-PH")}/mo` : ""].filter(Boolean).join(" · ");

export function LandlordSubmissionsList({
  submissions,
  availableIds,
  feedback,
  correctionTargets,
  linkClass,
  pageSize = 10,
}: LandlordSubmissionsListProps) {
  const [page, setPage] = useState(1);
  const availableSet = new Set(availableIds);
  const totalPages = Math.max(1, Math.ceil(submissions.length / pageSize));
  const validPage = Math.min(page, totalPages);
  const paginated = submissions.slice((validPage - 1) * pageSize, validPage * pageSize);

  return (
    <>
      <ul className="mt-4 grid list-none gap-3 p-0">
        {paginated.map((property) => (
          <li key={property.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:p-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border/80 bg-muted text-muted-foreground"><Building2 size={19} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="m-0 truncate text-base font-semibold text-foreground">{property.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[property.status === "approved" && availableSet.has(property.id) ? "live" : property.status] ?? "bg-muted text-muted-foreground"}`}>
                    {property.status === "pending"
                      ? "Pending review"
                      : property.status === "rejected"
                        ? "Changes requested"
                        : property.status === "approved"
                          ? availableSet.has(property.id)
                            ? "Published · Available"
                            : "Published · Unavailable"
                          : "Archived"}
                  </span>
                </div>
                {metaLine(property) && <p className="mb-0 mt-1 truncate text-sm text-muted-foreground">{metaLine(property)}</p>}
                {property.status === "rejected" && feedback[property.id] && (
                  <p role="note" className="mb-0 mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-300">{feedback[property.id]}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
              <Link href={`/landlord/map?selected=${encodeURIComponent(property.id)}`} className={linkClass}>
                <MapPinned size={15} aria-hidden="true" /> View on map
              </Link>
              {(property.status === "pending" || property.status === "rejected") && correctionTargets[property.id] && (
                <Link
                  href={`/list-property?draftId=${encodeURIComponent(correctionTargets[property.id].draftId)}&revision=${correctionTargets[property.id].revision}`}
                  className={linkClass}
                >
                  {property.status === "pending" ? "Edit submission" : "Correct and resubmit"}{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              )}
              {property.status === "approved" && correctionTargets[property.id] && (
                <Link
                  href={`/list-property?draftId=${encodeURIComponent(correctionTargets[property.id].draftId)}&revision=${correctionTargets[property.id].revision}&lockedLocation=1`}
                  className={linkClass}
                >
                  Update listing <ArrowRight size={15} aria-hidden="true" />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Pagination
        currentPage={validPage}
        totalPages={totalPages}
        totalItems={submissions.length}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </>
  );
}
