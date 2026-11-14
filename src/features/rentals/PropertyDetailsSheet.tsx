"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Bath,
  Bookmark,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  MapPin,
  Maximize2,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/features/rentals/search";
import {
  formatCurfew,
  formatOccupancy,
  formatTenantPolicy,
  getAmenityIcon,
} from "@/features/rentals/formatters";
import type { RentalResult } from "@/contracts/preview";
import type { RentalThreadDetail } from "@/features/messages/messaging-client";

export interface PropertyDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  rental?: RentalResult | null;
  thread?: RentalThreadDetail | null;
  canSave?: boolean;
  saved?: boolean;
  onToggleSaved?: (id: string) => void;
  canMessage?: boolean;
  onMessage?: (id: string) => void;
  side?: "right" | "bottom";
}

const PROPERTY_TYPE_NAMES: Record<string, string> = {
  boarding_house: "Boarding house",
  private_room: "Private room",
  bedspace: "Bedspace",
  shared_room: "Shared room",
  studio: "Studio",
  apartment: "Apartment",
  condo: "Condo",
  house: "House",
};

export function getPropertyHeaderInfo(
  rental?: RentalResult | null,
  thread?: RentalThreadDetail | null
) {
  const title = rental?.title ?? thread?.listingTitle ?? "Property details";
  const address =
    rental?.address ??
    (rental?.locality ? rental.locality : null) ??
    thread?.listingAddress ??
    thread?.listingCity ??
    "Cebu City";
  return { title, address };
}

export function PropertyDetailsSheetBody({
  rental,
  thread,
  loading: externalLoading,
}: {
  rental?: RentalResult | null;
  thread?: RentalThreadDetail | null;
  loading?: boolean;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);

  const { title, address } = getPropertyHeaderInfo(rental, thread);
  const loading = externalLoading;

  const photos =
    rental?.imageUrls && rental.imageUrls.length > 0
      ? rental.imageUrls
      : thread?.listingPhotoUrl || thread?.listingThumbnailUrl
      ? [thread.listingPhotoUrl || thread.listingThumbnailUrl!]
      : [];

  const safeIndex = Math.min(Math.max(photoIndex, 0), Math.max(photos.length - 1, 0));
  const price = rental?.price ?? thread?.listingPrice ?? null;
  const basis = rental?.basis ?? "room";

  const rawType = rental?.propertyType ?? rental?.type ?? "Property";
  const propertyTypeLabel = PROPERTY_TYPE_NAMES[rawType] ?? rawType.replaceAll(/[-_]/g, " ");

  const isVerified = rental?.verificationStatus === "property_verified";
  const isPending = rental?.verificationStatus === "unverified";

  const occupancy = formatOccupancy(rental?.maxOccupants);
  const tenantPolicy = formatTenantPolicy(rental?.tenantPolicy);
  const curfew = formatCurfew(rental?.curfewType);

  const specs = [
    { label: "Occupancy", value: occupancy, Icon: Users },
    { label: "Property type", value: propertyTypeLabel, Icon: Home },
    rental?.bathroomType
      ? { label: "Bathroom", value: `${rental.bathroomType} bathroom`, Icon: Bath }
      : null,
    rental?.area && rental.area > 0
      ? { label: "Floor area", value: `${rental.area} sqm`, Icon: Maximize2 }
      : null,
    rental?.tenantPolicy
      ? { label: "Tenant policy", value: tenantPolicy, Icon: ShieldCheck }
      : null,
    rental?.curfewType
      ? { label: "Curfew", value: curfew, Icon: Clock }
      : null,
  ].filter(Boolean) as { label: string; value: string; Icon: typeof Home }[];

  const handleGalleryKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (photos.length <= 1) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPhotoIndex((safeIndex - 1 + photos.length) % photos.length);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPhotoIndex((safeIndex + 1) % photos.length);
    }
  };

  return (
    <div className="flex flex-col gap-5 text-sm pb-2">
      {/* Photo Gallery Viewer */}
      <div
        tabIndex={photos.length > 1 ? 0 : undefined}
        onKeyDown={handleGalleryKeyDown}
        aria-label="Property photo gallery"
        className="group relative aspect-16/10 w-full overflow-hidden rounded-2xl bg-muted border border-border focus-visible:outline-2 focus-visible:outline-ring"
      >
        {photos.length > 0 ? (
          <>
            <Image
              src={photos[safeIndex]}
              alt={`Photo ${safeIndex + 1} of ${title}`}
              fill
              sizes="(max-width: 640px) 100vw, 540px"
              unoptimized
              className="object-cover select-none"
            />
            <span className="absolute top-2.5 right-2.5 rounded-full bg-black/65 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-xs select-none">
              {safeIndex + 1} / {photos.length}
            </span>
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => setPhotoIndex((safeIndex - 1 + photos.length) % photos.length)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/80 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => setPhotoIndex((safeIndex + 1) % photos.length)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/80 transition-colors cursor-pointer"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground p-6 text-center select-none">
            <Building2 size={36} aria-hidden="true" />
            <p className="text-sm font-semibold m-0 text-foreground">Property photo gallery</p>
            <span className="text-xs text-muted-foreground">No photos provided</span>
          </div>
        )}
      </div>

      {/* Thumbnail Scrubber Strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {photos.map((url, i) => (
            <button
              key={url + i}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === safeIndex}
              onClick={() => setPhotoIndex(i)}
              className={`relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition cursor-pointer ${
                i === safeIndex
                  ? "border-action ring-1 ring-action/50"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={url} alt="" fill unoptimized className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Price & Category Bar */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground m-0">
            {price != null ? formatPrice(Number(price)) : "Price on request"}
            <span className="text-xs font-normal text-muted-foreground">
              {" "}
              / month · per {basis}
            </span>
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin size={13} className="shrink-0 text-action" aria-hidden="true" />
            <span className="truncate">{address}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-semibold text-foreground">
            {propertyTypeLabel}
          </span>
          {rental?.totalUnitsCount && rental.totalUnitsCount > 1 && (
            <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-sky-700 dark:text-sky-300">
              {rental.availableUnitsCount ?? 0} of {rental.totalUnitsCount} units available
            </span>
          )}
          {isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={12} aria-hidden="true" />
              Verified property
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle size={12} aria-hidden="true" />
              Pending verification
            </span>
          ) : null}
        </div>
      </div>

      {/* Pending verification advisory disclaimer */}
      {isPending && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300"
        >
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <p className="m-0 leading-relaxed">
            This listing is awaiting staff verification of property and landlord credentials. Exercise standard caution when inquiring.
          </p>
        </div>
      )}

      {/* Property Information 2-column Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
          Property information
        </h3>
        <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-border bg-card p-3">
          {specs.map(({ label, value, Icon }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-action/10 text-action">
                <Icon size={14} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="m-0 text-[0.65rem] font-medium text-muted-foreground truncate">
                  {label}
                </p>
                <p className="m-0 text-xs font-semibold text-foreground truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-unit room pills */}
      {rental?.units && rental.units.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
              Units &amp; Rooms
            </h3>
            {rental.totalUnitsCount && rental.totalUnitsCount > 1 && (
              <span className="text-xs font-medium text-muted-foreground">
                {rental.availableUnitsCount ?? 0} of {rental.totalUnitsCount} units available
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {rental.units.map((unit) => (
              <span
                key={unit.id}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs ${
                  unit.isAvailable
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium"
                    : "border-border bg-muted/40 text-muted-foreground line-through opacity-75"
                }`}
              >
                <span>
                  {unit.unitNumber} ({unit.isAvailable ? `Available — ₱${unit.monthlyRent?.toLocaleString("en-PH") ?? "0"}/mo` : "Occupied"})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Amenities Section */}
      {rental?.amenities && rental.amenities.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
            Amenities
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {rental.amenities.map((amenity, idx) => {
              const IconComponent = getAmenityIcon(amenity);
              return (
                <span
                  key={amenity + idx}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  <IconComponent size={13} className="text-action" aria-hidden="true" />
                  <span>{amenity}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* About this property (Description) */}
      <div className="space-y-1.5 border-t border-border pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
          About this property
        </h3>
        {loading ? (
          <div className="space-y-2 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : rental?.description ? (
          <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed m-0">
            {rental.description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic m-0">No description provided.</p>
        )}
      </div>

      {/* Listed by: always the listing owner, never the viewer or the chat counterpart. */}
      {thread && thread.listingOwner !== undefined && (
        <div className="rounded-xl border border-border bg-card p-3 mt-1">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground mb-2 m-0">
            Listed by
          </p>
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              {thread.listingOwner?.avatarUrl ? (
                <AvatarImage
                  src={thread.listingOwner.avatarUrl}
                  alt={thread.listingOwner.fullName ?? "Landlord"}
                />
              ) : null}
              <AvatarFallback className="text-xs font-semibold">
                {(thread.listingOwner?.fullName ?? "L").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate m-0">
                {thread.listingOwner ? (thread.listingOwner.fullName ?? "Landlord") : "Landlord unavailable"}
              </p>
              {thread.listingOwner && (
                <span className="inline-flex items-center rounded-full border border-border px-1.5 py-0 text-[0.65rem] capitalize text-muted-foreground">
                  {thread.listingOwner.role}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PropertyDetailsSheetFooter({
  canMessage = false,
  canSave = false,
  saved = false,
  onMessage,
  onToggleSaved,
  rental,
  thread,
}: {
  canMessage?: boolean;
  canSave?: boolean;
  saved?: boolean;
  onMessage?: (id: string) => void;
  onToggleSaved?: (id: string) => void;
  rental?: RentalResult | null;
  thread?: RentalThreadDetail | null;
}) {
  if (!canMessage && !canSave) return null;
  return (
    <div className="flex items-center gap-2">
      {canMessage && (
        <Button
          type="button"
          variant="primary"
          size="md"
          className="flex-1 min-h-11 font-semibold flex items-center justify-center gap-2 cursor-pointer"
          onClick={() => {
            const targetId = rental?.id ?? thread?.listingId;
            if (targetId) onMessage?.(targetId);
          }}
        >
          <MessageSquare size={17} aria-hidden="true" />
          <span>Message landlord</span>
        </Button>
      )}
      {canSave && (
        <Button
          type="button"
          variant="outline"
          size="md"
          aria-label={saved ? "Remove listing from saved" : "Save listing"}
          aria-pressed={saved}
          title={saved ? "Saved" : "Save listing"}
          className={`size-11 min-h-11 min-w-11 p-0 flex items-center justify-center rounded-xl border border-border cursor-pointer transition ${
            saved
              ? "bg-action/10 text-action border-action/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          onClick={() => {
            const targetId = rental?.id ?? thread?.listingId;
            if (targetId) onToggleSaved?.(targetId);
          }}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

export function PropertyDetailsSheet({
  open,
  onClose,
  rental: initialRental,
  thread,
  canSave = false,
  saved = false,
  onToggleSaved,
  canMessage = false,
  onMessage,
  side,
}: PropertyDetailsSheetProps) {
  const [fetched, setFetched] = useState<{ id: string; rental: RentalResult | null }>({
    id: "",
    rental: null,
  });
  const [loading, setLoading] = useState(false);

  // If only a thread is provided, fetch full rental data by thread.listingId
  useEffect(() => {
    if (initialRental || !thread?.listingId || !open) return;
    const targetListingId = thread.listingId;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/rentals?id=${encodeURIComponent(targetListingId)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Could not load property");
        const json = await res.json();
        if (active && Array.isArray(json?.rentals)) {
          const match = json.rentals.find((r: RentalResult) => r.id === targetListingId) ?? null;
          if (match) setFetched({ id: targetListingId, rental: match });
        }
      } catch {
        // Fall back to thread-level details
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [initialRental, thread?.listingId, open]);

  const rental = initialRental ?? (fetched.id === thread?.listingId ? fetched.rental : null);
  const { title, address } = getPropertyHeaderInfo(rental, thread);

  const footer = (
    <PropertyDetailsSheetFooter
      canMessage={canMessage}
      canSave={canSave}
      saved={saved}
      onMessage={onMessage}
      onToggleSaved={onToggleSaved}
      rental={rental}
      thread={thread}
    />
  );

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const effectiveSide = side ?? (isMobile ? "bottom" : "right");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={address}
      side={effectiveSide}
      footer={footer}
      className="w-full sm:max-w-md lg:max-w-lg"
    >
      <PropertyDetailsSheetBody
        rental={rental}
        thread={thread}
        loading={loading}
      />
    </Sheet>
  );
}
