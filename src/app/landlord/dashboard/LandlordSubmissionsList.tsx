"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, MapPinned } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import type { LandlordManagedProperty } from "@/server/landlord-properties";
import { formatListingAddress, formatPropertyType } from "@/features/landlord/property-display";

export type LandlordSubmissionsListProps = {
  items: LandlordManagedProperty[];
  linkClass?: string;
  pageSize?: number;
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case "published":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "pending":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "rejected":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400";
    case "draft":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function LandlordSubmissionsList({
  items,
  linkClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  pageSize = 10,
}: LandlordSubmissionsListProps) {
  const [page, setPage] = useState(1);
  const propertyList = items;
  const totalPages = Math.max(1, Math.ceil(propertyList.length / pageSize));
  const validPage = Math.min(page, totalPages);
  const paginated = propertyList.slice((validPage - 1) * pageSize, validPage * pageSize);

  return (
    <>
      <ul className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] list-none gap-3 p-0">
        {paginated.map((property) => {
          const address = formatListingAddress(property.address, property.city);
          const propertyType = formatPropertyType(property.propertyType);
          const priceStr = typeof property.price === "number" ? `₱${property.price.toLocaleString("en-PH")}/mo` : "";
          const meta = [address, propertyType, priceStr].filter(Boolean).join(" · ");

          return (
            <li
              key={property.id}
              className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:p-4"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground">
                  {property.thumbnailUrl ? (
                    <Image
                      src={property.thumbnailUrl}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="size-12 object-cover"
                    />
                  ) : (
                    <Building2 size={20} aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="m-0 min-w-0 max-w-full truncate text-base font-semibold text-foreground">
                      {property.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(
                        property.status
                      )}`}
                    >
                      {property.statusLabel}
                    </span>
                    {property.hasPendingRevision && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        Revision under review
                      </span>
                    )}
                  </div>
                  {meta && (
                    <p className="mb-0 mt-1 min-w-0 max-w-full truncate text-sm text-muted-foreground">
                      {meta}
                    </p>
                  )}
                  {property.rejectionReason && (
                    <p
                      role="note"
                      className="mb-0 mt-2 break-words rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-300"
                    >
                      {property.rejectionReason}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
                {property.mapHref && (
                  <Link href={property.mapHref} className={linkClass}>
                    <MapPinned size={15} aria-hidden="true" /> View on map
                  </Link>
                )}

                {property.status === "rejected" && property.editHref && (
                  <Link href={property.editHref} className={linkClass}>
                    Correct and resubmit <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                )}

                {property.status === "pending" && property.editHref && (
                  <Link href={property.editHref} className={linkClass}>
                    Edit submission <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                )}

                {property.status === "draft" && (
                  <Link href={property.editHref ?? "/list-property"} className={linkClass}>
                    Edit draft <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                )}

                {property.status === "published" && (
                  property.editHref ? (
                    <Link href={property.editHref} className={linkClass}>
                      Update listing <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  ) : (
                    <Link href="/landlord/properties" className={linkClass}>
                      Manage
                    </Link>
                  )
                )}

                {property.status === "archived" && (
                  <Link href="/landlord/properties" className={linkClass}>
                    Manage
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Pagination
        currentPage={validPage}
        totalPages={totalPages}
        totalItems={propertyList.length}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </>
  );
}
