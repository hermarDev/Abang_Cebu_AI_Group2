import { MapLibreView } from "@/components/map";
import { getCebuListings } from "@/server/queries/get-listings";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MapPin, Info } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cebu Rental Map Explorer | AbangCebuAI",
  description: "Explore AI-indexed rental properties across Cebu City, Mandaue, and Mactan.",
};

export default async function MapPage() {
  // 1. Data fetched securely on the server via Server Component
  const listings = await getCebuListings();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              Cebu Geospatial Map Explorer
            </h1>
            <Badge variant="default">MapLibre GL</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Interactive spatial view with Next.js 15 Server-to-Client boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success">{listings.length} Active Listings</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left: Map Viewer (Client Boundary) */}
        <div className="lg:col-span-3">
          <div className="h-[600px] w-full overflow-hidden rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800">
            <MapLibreView markers={listings} />
          </div>
        </div>

        {/* Right: Listings Sidebar */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4 text-blue-600" />
                <span>Geospatial Architecture</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
              <p>
                <strong>Server Component:</strong> Fetched listings on the server with zero client bundle overhead.
              </p>
              <p>
                <strong>Client Boundary:</strong> Dynamic MapLibre instance rendered strictly on the browser with WebGL lifecycle cleanup.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
            {listings.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-zinc-200 bg-white p-3 shadow-xs hover:border-blue-400 transition-colors dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </h4>
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {item.propertyType || "Rental"}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                  <MapPin className="h-3 w-3 text-zinc-400" />
                  <span className="truncate">{item.address}</span>
                </div>
                {item.price && (
                  <div className="mt-2 font-bold text-sm text-blue-600 dark:text-blue-400">
                    {item.currency} {item.price.toLocaleString()}
                    <span className="text-xs font-normal text-zinc-500"> / month</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
