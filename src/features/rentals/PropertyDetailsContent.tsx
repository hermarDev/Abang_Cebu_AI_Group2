"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bath,
  Bed,
  Building2,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/features/rentals/search";
import type { RentalResult } from "@/contracts/preview";
import type { RentalThreadDetail } from "@/features/messages/messaging-client";
import { listingBadgeLabel, listingHref } from "@/features/messages/messaging-client";

export function PropertyDetailsContent({
  thread,
  userRole,
  onClose,
}: {
  thread: RentalThreadDetail;
  userRole: "renter" | "landlord";
  onClose?: () => void;
}) {
  const [rental, setRental] = useState<RentalResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadListing() {
      setLoading(true);
      try {
        const res = await fetch(`/api/rentals?id=${encodeURIComponent(thread.listingId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load rental details");
        const json = await res.json();
        if (active && Array.isArray(json?.rentals)) {
          const match = json.rentals.find((r: RentalResult) => r.id === thread.listingId) ?? json.rentals[0];
          if (match) setRental(match);
        }
      } catch {
        // Fall back to thread-level metadata
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadListing();
    return () => {
      active = false;
    };
  }, [thread.listingId]);

  const photos = rental?.imageUrls?.length
    ? rental.imageUrls
    : thread.listingPhotoUrl || thread.listingThumbnailUrl
    ? [thread.listingPhotoUrl || thread.listingThumbnailUrl!]
    : [];

  const safeIndex = Math.min(Math.max(photoIndex, 0), Math.max(photos.length - 1, 0));
  const price = rental?.price ?? thread.listingPrice;
  const address = rental?.address ?? thread.listingAddress ?? thread.listingCity ?? "Cebu City";
  const propertyType = (rental?.propertyType ?? rental?.type ?? "Property").replaceAll(/[-_]/g, " ");

  const specs = [
    { label: "Property type", value: propertyType, Icon: Home },
    rental?.maxOccupants ? { label: "Max occupants", value: `${rental.maxOccupants} person${rental.maxOccupants > 1 ? "s" : ""}`, Icon: Bed } : null,
    rental?.bathroomType ? { label: "Bathroom", value: `${rental.bathroomType} bathroom`, Icon: Bath } : null,
    rental?.area && rental.area > 0 ? { label: "Floor area", value: `${rental.area} m²`, Icon: Maximize2 } : null,
  ].filter(Boolean) as { label: string; value: string; Icon: typeof Home }[];

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Photo carousel */}
      <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl bg-muted border border-border">
        {photos.length > 0 ? (
          <>
            <Image
              src={photos[safeIndex]}
              alt={`Photo ${safeIndex + 1} of ${thread.listingTitle}`}
              fill
              sizes="(max-width: 640px) 100vw, 480px"
              unoptimized
              className="object-cover"
            />
            {photos.length > 1 && (
              <>
                <span className="absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-xs">
                  {safeIndex + 1}/{photos.length}
                </span>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => setPhotoIndex((safeIndex - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/75 cursor-pointer"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => setPhotoIndex((safeIndex + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/75 cursor-pointer"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Building2 size={32} aria-hidden="true" />
            <span className="text-xs">No photos available</span>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {photos.map((url, i) => (
            <button
              key={url + i}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === safeIndex}
              onClick={() => setPhotoIndex(i)}
              className={`relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === safeIndex ? "border-action" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={url} alt="" fill unoptimized className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Price & Status */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xl font-bold tracking-tight text-foreground">
            {price != null ? `${formatPrice(Number(price))}/month` : "Price on request"}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin size={13} className="shrink-0 text-action" aria-hidden="true" />
            <span className="truncate">{address}</span>
          </div>
        </div>
        <Badge
          variant={listingBadgeLabel(thread) === "Published · Available" ? "default" : "secondary"}
          className="shrink-0 text-xs"
        >
          {listingBadgeLabel(thread)}
        </Badge>
      </div>

      {/* Specs table */}
      {specs.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-border bg-card p-3">
          {specs.map(({ label, value, Icon }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-action/10 text-action">
                <Icon size={14} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="m-0 text-[0.68rem] font-medium text-muted-foreground truncate">{label}</p>
                <p className="m-0 text-xs font-semibold text-foreground truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : rental?.description ? (
        <div className="border-t border-border pt-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">About this property</h4>
          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">{rental.description}</p>
        </div>
      ) : null}

      {/* Amenities */}
      {rental?.amenities && rental.amenities.length > 0 && (
        <div className="border-t border-border pt-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Amenities</h4>
          <div className="flex flex-wrap gap-1.5">
            {rental.amenities.map((amenity, idx) => (
              <span key={amenity + idx} className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-foreground">
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Landlord card */}
      {thread.counterpart && (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Listed by
          </p>
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              {thread.counterpart.avatarUrl ? (
                <AvatarImage src={thread.counterpart.avatarUrl} alt={thread.counterpart.fullName ?? "Landlord"} />
              ) : null}
              <AvatarFallback className="text-xs font-semibold">
                {(thread.counterpart.fullName ?? "L").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">{thread.counterpart.fullName ?? "Landlord"}</p>
              <span className="inline-flex items-center rounded-full border border-border px-1.5 py-0 text-[0.65rem] capitalize text-muted-foreground">
                {thread.counterpart.role}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Full listing link at bottom */}
      <div className="mt-auto border-t border-border pt-4">
        <Link
          href={listingHref(thread, userRole)}
          onClick={onClose}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted text-foreground transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ExternalLink size={15} aria-hidden="true" />
          <span>
            {userRole === "landlord" ? "Manage in property map" : "View on rental map"}
          </span>
        </Link>
      </div>
    </div>
  );
}
