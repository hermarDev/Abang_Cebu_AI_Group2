import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { loadProfile } from "@/lib/supabase/profile";
import { SavedRentalsContent } from "./SavedRentalsContent";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Saved rentals — AbangCebu",
  description: "View and manage the Cebu rentals you have saved.",
};

export default async function SavedRentalsPage() {
  const { user, profile, profileError } = await loadProfile();
  if (!user) redirect("/login?next=%2Ffavorites");

  if (profileError) {
    return <main className="grid min-h-[100dvh] place-items-center bg-background p-5 text-foreground">
      <section className="max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm" role="alert">
        <h1 className="text-xl font-semibold">Saved rentals are unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">We could not verify your account. Please reload and try again.</p>
      </section>
    </main>;
  }
  if (profile?.role !== "renter" || profile.is_suspended) notFound();

  return <SavedRentalsContent userId={user.id} />;
}