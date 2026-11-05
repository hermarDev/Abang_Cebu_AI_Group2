import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandlordPropertyMap } from "@/features/landlord/LandlordPropertyMap";
import { LandlordMobileNav } from "@/features/landlord/LandlordMobileNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your property map — AbangCebu" };

export default async function LandlordMapPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Flandlord%2Fmap");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "landlord" || profile.is_suspended) notFound();

  const { data, error } = await supabase.from("listings")
    .select("id,title,price,property_type,address,city,latitude,longitude,is_available,status")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const properties = (data ?? []).filter(listing => listing.latitude != null && listing.longitude != null && Number.isFinite(Number(listing.latitude)) && Number.isFinite(Number(listing.longitude)) && Math.abs(Number(listing.latitude)) <= 90 && Math.abs(Number(listing.longitude)) <= 180).map(listing => ({ ...listing, price: Number(listing.price), latitude: Number(listing.latitude), longitude: Number(listing.longitude) }));

  return <main className="min-h-[100dvh] bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground lg:pb-0">
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/landlord/dashboard" aria-label="AbangCebu landlord workspace" className="flex min-w-0 items-center gap-3"><Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} unoptimized className="h-auto w-24 dark:hidden sm:w-32" loading="eager" /><Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} unoptimized className="hidden h-auto w-24 dark:block sm:w-32" loading="eager" /><span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground sm:inline">Property map</span></Link>
        <Link href="/landlord/dashboard" aria-label="Back to dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ArrowLeft size={17} aria-hidden="true" /><span className="hidden sm:inline">Back to dashboard</span><span className="sm:hidden">Dashboard</span></Link>
      </div>
    </header>
    <LandlordPropertyMap properties={properties} loadError={Boolean(error)} />
    <LandlordMobileNav />
  </main>;
}