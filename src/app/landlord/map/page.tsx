import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Compass, HousePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LandlordPropertyMap } from "@/features/landlord/LandlordPropertyMap";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your property map — AbangCebu",
  description: "View your rental properties and their listing status on a private map.",
};

export default async function LandlordMapPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Flandlord%2Fmap");

  const { data: profile } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profile?.role !== "landlord" || profile.is_suspended) notFound();

  const { data, error } = await supabase.from("listings")
    .select("id,title,price,property_type,address,city,latitude,longitude,is_available,status,submitted_at,reviewed_at,rejection_reason")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const properties = (data ?? []).map((listing) => ({
    ...listing,
    price: Number(listing.price),
    latitude: Number(listing.latitude),
    longitude: Number(listing.longitude),
  }));

  return <main className="min-h-[100dvh] bg-background text-foreground">
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-lg">
      <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/landlord/dashboard" className="flex min-w-0 items-center gap-3" aria-label="Back to landlord dashboard">
          <Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} className="h-auto w-28 dark:hidden sm:w-32" loading="eager" />
          <Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} className="hidden h-auto w-28 dark:block sm:w-32" loading="eager" />
          <span className="hidden h-8 border-l border-border sm:block" />
          <span className="hidden text-sm font-semibold text-muted-foreground sm:block">Property map</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/landlord/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted sm:px-4">
            <Compass size={16} aria-hidden="true" /><span className="hidden sm:inline">Back to dashboard</span><span className="sm:hidden">Dashboard</span>
          </Link>
          <Link href="/list-property" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-action px-3 text-sm font-bold text-action-foreground hover:bg-action-hover sm:px-4">
            <HousePlus size={16} aria-hidden="true" /><span className="hidden sm:inline">List a property</span><span className="sm:hidden">List</span>
          </Link>
        </div>
      </div>
    </header>
    <LandlordPropertyMap properties={properties} loadError={Boolean(error)} />
  </main>;
}
