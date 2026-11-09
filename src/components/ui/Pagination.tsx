"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const validCurrent = Math.max(1, Math.min(currentPage, totalPages));

  const getPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [1];
    if (validCurrent > 3) pages.push("ellipsis");
    const start = Math.max(2, validCurrent - 1);
    const end = Math.min(totalPages - 1, validCurrent + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (validCurrent < totalPages - 2) pages.push("ellipsis");
    if (!pages.includes(totalPages)) pages.push(totalPages);
    return pages;
  };

  const pages = getPages();

  let summary: string | null = null;
  if (typeof totalItems === "number" && typeof pageSize === "number" && totalItems > 0) {
    const from = (validCurrent - 1) * pageSize + 1;
    const to = Math.min(validCurrent * pageSize, totalItems);
    summary = `Showing ${from}–${to} of ${totalItems}`;
  }

  const buttonBase =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col items-center justify-between gap-3 pt-3 sm:flex-row ${className}`}
    >
      <div className="text-xs text-muted-foreground sm:text-sm">
        {summary ? <span>{summary}</span> : <span>Page {validCurrent} of {totalPages}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={validCurrent <= 1}
          onClick={() => onPageChange(validCurrent - 1)}
          className={`${buttonBase} border-border bg-card text-foreground hover:bg-muted`}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                aria-hidden="true"
                className="grid min-h-11 min-w-8 place-items-center text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-label={`Page ${p}`}
                aria-current={p === validCurrent ? "page" : undefined}
                onClick={() => onPageChange(p)}
                className={`${buttonBase} ${
                  p === validCurrent
                    ? "border-action bg-action font-semibold text-action-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          aria-label="Next page"
          disabled={validCurrent >= totalPages}
          onClick={() => onPageChange(validCurrent + 1)}
          className={`${buttonBase} border-border bg-card text-foreground hover:bg-muted`}
        >
          <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
