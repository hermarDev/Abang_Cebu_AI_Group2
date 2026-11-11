import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { MapPinned } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { createClient } from "@/lib/supabase/server";
import { signProfileAvatar } from "@/lib/profile-avatar";
import { MessagingInbox } from "@/features/messages/MessagingInbox";
import { LandlordWorkspaceLayout } from "../dashboard/LandlordWorkspaceLayout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages — AbangCebu", description: "Your conversations with renters." };

export default async function LandlordMessagesPage({ searchParams }: { searchParams?: Promise<{ thread?: string | string[] }> } = {}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && isAuthRetryableFetchError(authError)) return <main><p role="alert">Your account could not be checked. Please refresh the page to try again.</p></main>;
  if (authError || !user) redirect("/login?next=%2Flandlord%2Fmessages");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name,avatar_url,role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "landlord" || profile.is_suspended) notFound();
  const displayName = profile?.full_name?.trim() || "landlord";
  const avatarUrl = await signProfileAvatar(user.id, profile?.avatar_url);
  const thread = (await searchParams)?.thread;
  const initialThreadId = typeof thread === "string" ? thread : null;

  return <LandlordWorkspaceLayout
    userId={user.id}
    brand={<Link href="/landlord/dashboard" aria-label="AbangCebu landlord workspace" className="flex min-w-0 items-center gap-3"><Image src="/icons/main_Logo.png" alt="AbangCebu" width={299} height={100} unoptimized className="h-auto w-24 dark:hidden sm:w-32" loading="eager" /><Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} unoptimized className="hidden h-auto w-24 dark:block sm:w-32" loading="eager" /><span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground md:block">Messages</span></Link>}
    actions={<>
      <Link href="/landlord/map" aria-label="Open property map" className="hidden min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:inline-flex">
        <MapPinned size={17} aria-hidden="true" /><span>Property map</span>
      </Link>
      <AccountMenu displayName={displayName} avatarUrl={avatarUrl} role="Landlord" variant="header" />
    </>}
  >
    <h1 className="sr-only">Messages</h1>
    <div className="h-[calc(100dvh-8rem)] min-h-[28rem] lg:h-[calc(100dvh-8rem)]"><MessagingInbox userId={user.id} userRole="landlord" initialThreadId={initialThreadId} /></div>
  </LandlordWorkspaceLayout>;
}
