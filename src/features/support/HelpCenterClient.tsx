"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ChevronDown, Headset, Home, Search, X } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/components/ui/cn";
import {
  HELP_FAQ_CATEGORIES,
  HELP_FAQ_ITEMS,
  type HelpFaqCategoryId,
  type HelpFaqItem,
} from "@/lib/support/constants";

export interface HelpCenterClientProps {
  backHref: string;
  backLabel: string;
  userRole?: string | null;
  isLandlordMobile?: boolean;
}

export function HelpCenterClient({
  backHref,
  backLabel,
  isLandlordMobile = false,
}: HelpCenterClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<HelpFaqCategoryId>("all");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const searchInputId = useId();

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const filteredFaqs = useMemo(() => {
    return HELP_FAQ_ITEMS.filter((item: HelpFaqItem) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!trimmedQuery) return true;

      const inQuestion = item.question.toLowerCase().includes(trimmedQuery);
      const inAnswer = item.answer.toLowerCase().includes(trimmedQuery);
      const inKeywords = item.keywords.some((kw) =>
        kw.toLowerCase().includes(trimmedQuery)
      );

      return inQuestion || inAnswer || inKeywords;
    });
  }, [selectedCategory, trimmedQuery]);

  const allVisibleExpanded =
    filteredFaqs.length > 0 &&
    filteredFaqs.every((item) => openIds.has(item.id));

  function toggleFaq(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleExpandAll() {
    if (allVisibleExpanded) {
      setOpenIds(new Set());
    } else {
      setOpenIds(new Set(filteredFaqs.map((item) => item.id)));
    }
  }

  function resetFilters() {
    setSearchQuery("");
    setSelectedCategory("all");
    setOpenIds(new Set());
  }

  return (
    <main className={`relative isolate min-h-[100dvh] overflow-x-clip bg-background text-foreground${isLandlordMobile ? " pb-20 md:pb-0" : ""}`}>
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="sticky top-3 z-20 flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-white/90 p-3 shadow-sm backdrop-blur-sm dark:bg-slate-950/90 sm:px-5">
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>{backLabel}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/support"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Headset size={15} aria-hidden="true" />
              <span>Contact support</span>
            </Link>
            <BrandLogo className="h-auto w-28 sm:w-32" />
          </div>
        </header>

        <div
          className={cn(
            "relative z-10 mt-6 space-y-8 sm:mt-8",
            isLandlordMobile ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-16"
          )}
        >
          {/* Hero Section */}
          <section className="rounded-2xl border border-border/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:bg-slate-950/90 sm:p-6">
            <p className="m-0 text-xs font-bold uppercase tracking-[.14em] text-action">
              Support &amp; Documentation
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">
                  Help Center
                </h1>
                <p className="mb-0 mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Find answers to common questions about finding Cebu rentals, listing properties, account security, and platform policies.
                </p>
              </div>
              <Link
                href="/support"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Headset size={18} aria-hidden="true" />
                <span>Contact support</span>
              </Link>
            </div>
          </section>

          {/* Quick Guidance Cards */}
          <section className="grid gap-4 sm:grid-cols-2" aria-label="Quick Guidance">
            <article className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm backdrop-blur-sm sm:p-6">
              <div className="flex items-center gap-2 text-action">
                <Home size={18} aria-hidden="true" />
                <h2 className="m-0 text-base font-semibold text-foreground">For Renters</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Explore rentals across Metro Cebu on the interactive map. Filter by monthly budget, barangay, and property type. Always inspect units in person and verify landlord ownership before paying reservation deposits.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-xs font-medium">
                <Link href="/" className="text-action hover:underline">
                  Browse rentals →
                </Link>
                <span className="text-muted-foreground/40" aria-hidden="true">·</span>
                <Link href="/support" className="text-muted-foreground hover:text-foreground">
                  Ask a question
                </Link>
              </div>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm backdrop-blur-sm sm:p-6">
              <div className="flex items-center gap-2 text-action">
                <Building2 size={18} aria-hidden="true" />
                <h2 className="m-0 text-base font-semibold text-foreground">For Landlords</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Publish properties with pin-accurate Cebu coordinates. Upload Barangay or Mayor&apos;s permit documents for trusted moderation badges. Edit approved listings anytime without taking live properties offline.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-xs font-medium">
                <Link href="/list-property" className="text-action hover:underline">
                  List a property →
                </Link>
                <span className="text-muted-foreground/40" aria-hidden="true">·</span>
                <Link href="/support" className="text-muted-foreground hover:text-foreground">
                  Landlord support
                </Link>
              </div>
            </article>
          </section>

          {/* Search & Topic Filters */}
          <section className="space-y-4" aria-labelledby="faq-search-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="faq-search-heading" className="text-xl font-bold tracking-tight text-foreground">
                Frequently Asked Questions
              </h2>
              <p role="status" aria-live="polite" className="text-xs font-medium text-muted-foreground">
                {filteredFaqs.length === HELP_FAQ_ITEMS.length
                  ? `${HELP_FAQ_ITEMS.length} articles`
                  : `${filteredFaqs.length} of ${HELP_FAQ_ITEMS.length} articles`}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Search size={18} aria-hidden="true" />
              </span>
              <Input
                id={searchInputId}
                type="search"
                role="searchbox"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides, questions, or keywords…"
                aria-label="Search help articles"
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div
              className="flex flex-wrap items-center gap-2 pt-1"
              role="group"
              aria-label="Filter guides by category"
            >
              {HELP_FAQ_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer",
                      isSelected
                        ? "bg-action text-action-foreground shadow-xs"
                        : "border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Accordion Controls & Items */}
          <section className="space-y-4" aria-label="FAQ List">
            {filteredFaqs.length > 0 && (
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleExpandAll}
                  className="text-xs"
                >
                  {allVisibleExpanded ? "Collapse all" : "Expand all"}
                </Button>
              </div>
            )}

            {filteredFaqs.length === 0 ? (
              <div
                className="rounded-2xl border border-border/80 bg-card p-8 text-center"
                role="status"
              >
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Search size={22} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  No matching guides found
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  We couldn&apos;t find any answers matching your search. Try different keywords or reset your filters.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button type="button" variant="outline" onClick={resetFilters}>
                    Reset filters
                  </Button>
                  <Link
                    href="/support"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Contact support
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="list-none space-y-3 p-0">
                {filteredFaqs.map((faq) => {
                  const isOpen = openIds.has(faq.id);
                  const triggerId = `faq-trigger-${faq.id}`;
                  const panelId = `faq-panel-${faq.id}`;

                  return (
                    <li
                      key={faq.id}
                      className="overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-xs transition-colors"
                    >
                      <button
                        type="button"
                        id={triggerId}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleFaq(faq.id)}
                        className="flex min-h-11 w-full items-center justify-between gap-4 p-4 text-left font-medium text-foreground hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
                      >
                        <span className="text-sm font-semibold leading-snug sm:text-base">
                          {faq.question}
                        </span>
                        <ChevronDown
                          size={18}
                          className={cn(
                            "shrink-0 text-muted-foreground transition-transform duration-200",
                            isOpen && "rotate-180"
                          )}
                          aria-hidden="true"
                        />
                      </button>
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={triggerId}
                        hidden={!isOpen}
                        className={cn(
                          "border-t border-border/40 px-4 pb-4 pt-3 text-sm leading-relaxed text-muted-foreground",
                          !isOpen && "hidden"
                        )}
                      >
                        <p className="m-0 whitespace-pre-wrap">{faq.answer}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Need Further Assistance Banner */}
          <section className="rounded-2xl border border-border/70 bg-card/90 p-6 text-center sm:p-8">
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Still have questions?
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Can&apos;t find what you need in our guides? Submit a request to our support team and an administrator will respond within one business day.
            </p>
            <div className="mt-5 flex justify-center">
              <Link
                href="/support"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-action px-5 text-sm font-semibold text-action-foreground hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Headset size={18} aria-hidden="true" />
                <span>Contact support</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
