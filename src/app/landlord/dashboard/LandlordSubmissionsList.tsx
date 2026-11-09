"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";

export type SubmittedPropertyItem = {
  id: string;
  title: string | null;
  status: string;
};

export type LandlordSubmissionsListProps = {
  submissions: SubmittedPropertyItem[];
  availableIds: string[];
  feedback: Record<string, string>;
  correctionTargets: Record<string, { draftId: string; revision: number }>;
  linkClass: string;
  pageSize?: number;
};

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
          <li key={property.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h3 className="font-semibold">{property.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {property.status === "pending"
                ? "Pending review"
                : property.status === "rejected"
                  ? "Changes requested"
                  : property.status === "approved"
                    ? availableSet.has(property.id)
                      ? "Published · Available"
                      : "Published · Unavailable"
                    : "Archived"}
            </p>
            {property.status === "rejected" && feedback[property.id] && (
              <p className="mt-1 text-sm text-muted-foreground">{feedback[property.id]}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
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
