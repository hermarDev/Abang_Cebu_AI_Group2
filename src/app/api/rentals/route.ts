import { createClient } from "@/lib/supabase/server";
import { mapListing } from "@/server/rentals/map-listing";

const projection = "id,title,description,price,currency,rental_period,property_type,latitude,longitude,city,is_available,status,max_occupants,bathroom_type,cooking_allowed,laundry_allowed,curfew_type,wifi_available,aircon,water_included,electricity_included,motorcycle_parking,car_parking,verification_status,direct_landlord";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("listings")
      .select(projection)
      .eq("status", "published")
      .eq("is_available", true)
      .order("id", { ascending: true })
      .limit(200);
    if (error || !Array.isArray(data)) throw new Error("Rental read failed");
    return Response.json({ rentals: data.map(mapListing) }, { headers });
  } catch {
    return Response.json({ error: "Rental listings are temporarily unavailable. Please try again later." }, { status: 503, headers });
  }
}
