import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { AccountSettingsForm } from "./AccountSettingsForm";
import { LandlordMobileNav } from "@/features/landlord/LandlordMobileNav";

export const metadata: Metadata = {
  title: "Account settings — AbangCebu",
  description: "Manage your AbangCebu profile and account security.",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Faccount");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, phone_number, role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const avatarUrl = profile ? await signProfileAvatar(user.id, profile.avatar_url) : null;

  return <main className="relative isolate h-[100dvh] overflow-hidden bg-background text-foreground">
    <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href={profile?.role === "admin" ? "/admin/dashboard" : profile?.role === "landlord" ? "/landlord/dashboard" : "/"} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <ArrowLeft size={18} aria-hidden="true" /> {profile?.role === "admin" ? "Back to admin workspace" : profile?.role === "landlord" ? "Back to workspace" : "Back to map"}
          </Link>
          <BrandLogo className="h-auto w-32" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 lg:px-8 lg:pb-16">
        <div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Account settings</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Update your profile details and manage your sign-in security.</p>
        </div>

        {profileError || !profile ? (
          <section className="mt-6 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm" role="alert">
            <h2 className="text-lg font-semibold">We couldn’t load your account</h2>
            <p className="mt-2 text-sm text-muted-foreground">Refresh the page to try again. If the problem continues, contact support.</p>
          </section>
        ) : (
          <AccountSettingsForm key={user.id} profile={{ fullName: profile.full_name, phoneNumber: profile.phone_number, role: profile.role, email: user.email ?? "", avatarUrl }} />
        )}
      </div>
    </div>
    {profile?.role === "landlord" && <LandlordMobileNav userId={user.id} />}
  </main>;
}