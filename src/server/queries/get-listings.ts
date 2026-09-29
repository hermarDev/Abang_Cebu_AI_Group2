import { createClient } from "@/lib/supabase/server";
import { type MapMarker } from "@/types";

/**
 * Server query function fetching property listings.
 * Runs strictly on the server in Server Components or Server Actions.
 */
export async function getCebuListings(): Promise<MapMarker[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, price, currency, property_type, latitude, longitude, address")
      .limit(20);

    if (error || !data || data.length === 0) {
      // Fallback sample data centered around Cebu City landmarks
      return getFallbackCebuListings();
    }

    return data.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency || "PHP",
      propertyType: item.property_type,
      coordinates: [item.longitude, item.latitude],
      address: item.address,
    }));
  } catch {
    return getFallbackCebuListings();
  }
}

function getFallbackCebuListings(): MapMarker[] {
  return [
    {
      id: "cebu-it-park-1",
      title: "Avida Towers Riala - Studio Unit",
      price: 22000,
      currency: "PHP",
      propertyType: "condo",
      coordinates: [123.9063, 10.3297],
      address: "Jose Maria del Mar St, IT Park, Lahug, Cebu City",
    },
    {
      id: "cebu-biz-park-2",
      title: "Solinea Tower 2 - 1 Bedroom",
      price: 35000,
      currency: "PHP",
      propertyType: "condo",
      coordinates: [123.9056, 10.3173],
      address: "Cebu Business Park, Cebu City",
    },
    {
      id: "mactan-residence-3",
      title: "Mactan Newtown Executive Studio",
      price: 28000,
      currency: "PHP",
      propertyType: "condo",
      coordinates: [123.9794, 10.3129],
      address: "Newtown Blvd, Lapu-Lapu City, Mactan",
    },
    {
      id: "banilad-apartment-4",
      title: "Banilad Garden Apartment 2BR",
      price: 25000,
      currency: "PHP",
      propertyType: "apartment",
      coordinates: [123.9142, 10.3401],
      address: "Gov. M. Cuenco Ave, Banilad, Cebu City",
    },
  ];
}
