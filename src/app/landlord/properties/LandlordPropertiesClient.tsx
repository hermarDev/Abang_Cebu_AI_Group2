"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Ellipsis,
  Eye,
  HousePlus,
  MapPinned,
  Pencil,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { LandlordManagedProperty, LandlordPortfolioErrors } from "@/server/landlord-properties";
import { formatListingAddress, formatPropertyType } from "@/features/landlord/property-display";
import { PropertyDetailsSheet } from "@/features/rentals/PropertyDetailsSheet";
import type { RentalResult } from "@/contracts/preview";
import { createClient } from "@/lib/supabase/client";

type TabKey = "all" | "published" | "pending" | "rejected" | "draft" | "archived";

interface TabDef {
  key: TabKey;
  label: string;
  filter: (p: LandlordManagedProperty) => boolean;
}

const TABS: TabDef[] = [
  { key: "all", label: "All", filter: () => true },
  { key: "published", label: "Published", filter: (p) => p.status === "published" },
  { key: "pending", label: "Under review", filter: (p) => p.status === "pending" || Boolean(p.hasPendingRevision) },
  { key: "rejected", label: "Changes requested", filter: (p) => p.status === "rejected" },
  { key: "draft", label: "Drafts", filter: (p) => p.status === "draft" },
  { key: "archived", label: "Archived", filter: (p) => p.status === "archived" },
];

function statusBadgeClass(status: LandlordManagedProperty["status"]): string {
  switch (status) {
    case "published":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "rejected":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
    case "draft":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400";
    case "archived":
      return "border-muted-foreground/30 bg-muted/40 text-muted-foreground";
  }
}

export function LandlordPropertiesClient({
  properties,
  errors,
  truncated,
}: {
  properties: LandlordManagedProperty[];
  errors?: LandlordPortfolioErrors;
  truncated?: boolean;
}) {
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() ?? "";
  const parseStatus = (value: string | null | undefined): TabKey => {
    const normalized = (value || "all").toLowerCase() as TabKey;
    return TABS.some((t) => t.key === normalized) ? normalized : "all";
  };
  const initialTab = parseStatus(searchParams?.get("status"));
  const highlightId = searchParams?.get("highlight") || null;
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const prevSearchKeyRef = useRef(searchKey);
  const [selectedProperty, setSelectedProperty] = useState<LandlordManagedProperty | null>(null);
  const [unitAvailability, setUnitAvailability] = useState<Record<string, boolean>>({});
  const [togglingUnitId, setTogglingUnitId] = useState<string | null>(null);

  const handleToggleUnit = async (unitId: string, currentAvailable: boolean) => {
    setTogglingUnitId(unitId);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("landlord_set_unit_availability", {
        p_unit_id: unitId,
        p_is_available: !currentAvailable,
      });
      if (!error) {
        setUnitAvailability((prev) => ({ ...prev, [unitId]: !currentAvailable }));
      }
    } catch {
      // ignore
    } finally {
      setTogglingUnitId(null);
    }
  };

  useEffect(() => {
    if (prevSearchKeyRef.current === searchKey) return;
    prevSearchKeyRef.current = searchKey;
    setActiveTab(parseStatus(searchParams?.get("status")));
  }, [searchKey, searchParams]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`property-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId]);

  // Counts per tab
  const counts = useMemo(() => {
    const map: Record<TabKey, number> = {
      all: properties.length,
      published: 0,
      pending: 0,
      rejected: 0,
      draft: 0,
      archived: 0,
    };
    for (const p of properties) {
      if (p.status in map) map[p.status]++;
      if (p.hasPendingRevision && p.status !== "pending") map.pending++;
    }
    return map;
  }, [properties]);

  const filtered = useMemo(() => {
    const tabDef = TABS.find((t) => t.key === activeTab) ?? TABS[0];
    return properties.filter(tabDef.filter);
  }, [properties, activeTab]);

  // Convert managed property to synthetic RentalResult for preview sheet
  const previewRental: RentalResult | null = useMemo(() => {
    if (!selectedProperty) return null;
    return {
      id: selectedProperty.id,
      title: selectedProperty.title,
      address: selectedProperty.address,
      locality: selectedProperty.city,
      coordinates: [123.9, 10.3],
      price: selectedProperty.price ?? 0,
      type: "room",
      propertyType: selectedProperty.propertyType as never,
      basis: "room",
      amenities: selectedProperty.amenities,
      description: selectedProperty.description ?? "",
      area: 25,
      tone: "blue",
      available: selectedProperty.isAvailable,
      imageUrls: selectedProperty.imageUrls,
      distanceMeters: null,
    };
  }, [selectedProperty]);

  const hasError = Boolean(errors && Object.values(errors).some(Boolean));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your rental listings and track verification status.</p>
        </div>
        <Link
          href="/list-property"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-action px-5 text-sm font-semibold text-action-foreground transition hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <HousePlus size={16} aria-hidden="true" />
          <span>Add property</span>
        </Link>
      </div>

      {/* Partial error / truncation notifications */}
      {hasError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground"
        >
          <p className="m-0 font-medium">
            Some property information could not be loaded. Please refresh the page to try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Refresh
          </button>
        </div>
      )}

      {truncated && (
        <div
          role="status"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300"
        >
          Showing the first 1,000 properties. Your portfolio contains more items than can be displayed at once.
        </div>
      )}

      {/* Filter tabs / status pills */}
      <div className="flex flex-wrap gap-2 border-b border-border/80 pb-4" role="tablist" aria-label="Filter properties by status">
        {TABS.map((tab) => {
          const count = counts[tab.key];
          const isActive = activeTab === tab.key;
          // Hide archived or rejected tabs if 0 to keep UI clean, but always show All, Published, Under review, Drafts
          if (count === 0 && (tab.key === "archived" || tab.key === "rejected")) return null;

          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                isActive
                  ? "border-action/40 bg-action/10 text-action dark:bg-action/20"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.2 text-[0.65rem] ${isActive ? "bg-action text-action-foreground font-bold" : "bg-muted text-muted-foreground"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Property listings */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-action/10 text-action">
            <Building2 size={24} aria-hidden="true" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-foreground">No properties found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === "all"
              ? "You haven't added any properties yet. Click Add property to get started."
              : `You have no properties under "${TABS.find((t) => t.key === activeTab)?.label}".`}
          </p>
          {activeTab !== "all" && (
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"
            >
              Show all properties
            </button>
          )}
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:gap-4">
          {filtered.map((property) => (
            <article
              key={property.id}
              id={`property-${property.id}`}
              className={cn(
                "group relative flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-4 transition hover:border-action/40 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between",
                highlightId === property.id ? "border-action ring-2 ring-action/20" : "border-border"
              )}
            >
              {/* Thumbnail + info */}
              <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-24">
                  {property.thumbnailUrl ? (
                    <Image
                      src={property.thumbnailUrl}
                      alt={property.title}
                      fill
                      unoptimized
                      className="object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground">
                      <Building2 size={28} aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="min-w-0 max-w-full truncate text-base font-bold text-foreground sm:text-lg">
                      {property.title}
                    </h2>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${statusBadgeClass(
                        property.status
                      )}`}
                    >
                      {property.statusLabel}
                    </span>
                    {property.hasPendingRevision && (
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[0.68rem] font-semibold text-amber-700 dark:text-amber-400">
                        Revision under review
                      </span>
                    )}
                  </div>

                  <p className="mt-1 min-w-0 max-w-full truncate text-xs text-muted-foreground sm:text-sm">
                    {formatListingAddress(property.address, property.city) || "No address specified"}
                  </p>

                  <div className="mt-1 flex flex-wrap items-baseline gap-1 text-sm font-bold text-foreground">
                    {typeof property.price === "number" ? (
                      <>
                        <span>₱{property.price.toLocaleString("en-PH")}</span>
                        <span className="text-xs font-normal text-muted-foreground">/month</span>
                      </>
                    ) : (
                      <span className="text-xs font-normal text-muted-foreground">Price not set</span>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {formatPropertyType(property.propertyType)}
                    </span>
                  </div>

                  {property.rejectionReason && (
                    <div className="mt-2 break-words rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-foreground">
                      <span className="font-semibold text-destructive">Feedback: </span>
                      {property.rejectionReason}
                    </div>
                  )}

                  {property.units && property.units.length > 1 && (
                    <div className="mt-3 rounded-xl border border-border/70 bg-muted/30 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">Room availability</span>
                        <span className="text-[0.7rem] text-muted-foreground">
                          {property.units.filter((u) => unitAvailability[u.id] ?? u.isAvailable).length} of {property.units.length} available
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {property.units.map((u) => {
                          const isAvail = unitAvailability[u.id] ?? u.isAvailable;
                          return (
                            <div key={u.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-xs">
                              <span className="font-medium text-foreground">{u.unitNumber}</span>
                              <span className={`text-[0.65rem] ${isAvail ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"}`}>
                                ({isAvail ? "Available" : "Occupied"})
                              </span>
                              <button
                                type="button"
                                disabled={togglingUnitId === u.id}
                                onClick={() => void handleToggleUnit(u.id, isAvail)}
                                className="ml-1 rounded px-1.5 py-0.5 text-[0.65rem] font-medium border border-border hover:bg-muted text-foreground transition"
                              >
                                {isAvail ? "Mark occupied" : "Mark available"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedProperty(property)}
                  aria-label={`Preview ${property.title}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Eye size={14} aria-hidden="true" />
                  <span>Preview</span>
                </button>

                {property.editHref && (
                  <Link
                    href={property.editHref}
                    aria-label={`Edit ${property.title}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Pencil size={14} aria-hidden="true" />
                    <span>Edit</span>
                  </Link>
                )}

                {property.mapHref && (
                  <Link
                    href={property.mapHref}
                    aria-label={`View ${property.title} on map`}
                    title="View on property map"
                    className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <MapPinned size={15} aria-hidden="true" />
                  </Link>
                )}

                <details className="relative">
                  <summary
                    aria-label={`More options for ${property.title}`}
                    className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
                  >
                    <Ellipsis size={15} aria-hidden="true" />
                  </summary>
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 grid min-w-44 gap-1 rounded-xl border border-border bg-card p-1 text-card-foreground shadow-lg">
                    {property.mapHref && (
                      <Link
                        href={property.mapHref}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium hover:bg-muted"
                      >
                        <MapPinned size={14} aria-hidden="true" />
                        <span>Locate on map</span>
                      </Link>
                    )}
                    {property.editHref && (
                      <Link
                        href={property.editHref}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium hover:bg-muted"
                      >
                        <Pencil size={14} aria-hidden="true" />
                        <span>Edit details</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedProperty(property)}
                      className="inline-flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-medium hover:bg-muted"
                    >
                      <Eye size={14} aria-hidden="true" />
                      <span>Inspect preview</span>
                    </button>
                  </div>
                </details>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Preview Sheet */}
      {selectedProperty && (
        <PropertyDetailsSheet
          open={Boolean(selectedProperty)}
          onClose={() => setSelectedProperty(null)}
          rental={previewRental}
        />
      )}
    </div>
  );
}
