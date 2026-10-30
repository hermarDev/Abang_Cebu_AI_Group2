import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { AccountMapBackground } from "./AccountMapBackground";
import { AccountSettingsForm } from "./AccountSettingsForm";

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
  const hasCustomMapStyle = Boolean(process.env.NEXT_PUBLIC_MAP_STYLE_URL && process.env.NEXT_PUBLIC_MAP_STYLE_URL !== "/styles/osm.json");

  return <>
  <main className="relative isolate h-[100dvh] overflow-hidden bg-transparent text-foreground">
    <AccountMapBackground />
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1]" style={{ backgroundColor: "color-mix(in srgb, var(--background) 36%, transparent)", backdropFilter: "blur(1.5px)" }} />
    <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain">
    <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-20 sm:px-6 sm:pt-8 sm:pb-20 lg:px-8">
      <header className="sticky top-3 z-20 flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-white/90 p-3 shadow-sm backdrop-blur-sm dark:bg-slate-950/90 sm:px-5">
        <Link href={profile?.role === "landlord" ? "/landlord/dashboard" : "/"} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ArrowLeft size={18} aria-hidden="true" /> {profile?.role === "landlord" ? "Back to dashboard" : "Back to map"}
        </Link>
        <Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} className="h-auto w-32 dark:hidden" loading="eager" />
        <Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} className="hidden h-auto w-32 dark:block" loading="eager" />
      </header>

      <div className="relative z-10 mx-auto mt-8 w-full max-w-5xl">
        <div className="rounded-2xl border border-border/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:bg-slate-950/90 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[.14em] text-action">Your account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Account settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Update your profile details and manage your sign-in security.</p>
        </div>

        {profileError || !profile ? (
          <section className="mt-7 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm" role="alert">
            <h2 className="text-lg font-semibold">We couldn’t load your account</h2>
            <p className="mt-2 text-sm text-muted-foreground">Refresh the page to try again. If the problem continues, contact support.</p>
          </section>
        ) : (
          <AccountSettingsForm key={user.id} profile={{ fullName: profile.full_name, phoneNumber: profile.phone_number, role: profile.role, email: user.email ?? "", avatarUrl }} />
        )}
      </div>
    </div>
  </div>
  </main>
  {!hasCustomMapStyle && <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pt-2" style={{ paddingBottom: "max(.5rem, env(safe-area-inset-bottom))" }}>
    <p className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-1 rounded-full border border-border/70 bg-white/85 px-3 py-1.5 text-center text-[0.65rem] leading-relaxed text-muted-foreground shadow-sm backdrop-blur-sm dark:bg-slate-950/85">
      <span>Map data:</span> <a className="underline underline-offset-2 hover:text-foreground" href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>, <a className="underline underline-offset-2 hover:text-foreground" href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a>, and <a className="underline underline-offset-2 hover:text-foreground" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>.
    </p>
  </footer>}
  </>;
}
