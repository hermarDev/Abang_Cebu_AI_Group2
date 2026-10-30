import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SavedRentalsContent } from "./SavedRentalsContent";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Saved rentals — AbangCebu",
  description: "View and manage the Cebu rentals you have saved.",
};

export default async function SavedRentalsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Ffavorites");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return <main className="grid min-h-[100dvh] place-items-center bg-background p-5 text-foreground">
      <section className="max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm" role="alert">
        <h1 className="text-xl font-semibold">Saved rentals are unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">We could not verify your account. Please reload and try again.</p>
      </section>
    </main>;
  }
  if (profile?.role !== "renter" || profile.is_suspended) notFound();

  return <SavedRentalsContent />;
}