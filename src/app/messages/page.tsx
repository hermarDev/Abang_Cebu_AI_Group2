import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessagingInbox } from "@/features/messages/MessagingInbox";
import { MessagesAppearance } from "./MessagesAppearance";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages — AbangCebu", description: "Your conversations with landlords." };

export default async function MessagesPage({ searchParams }: { searchParams?: Promise<{ thread?: string | string[] }> } = {}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fmessages");
  const { data: profile } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (!profile || profile.is_suspended) redirect("/login");
  if (profile.role === "landlord") redirect("/landlord/messages");
  if (profile.role === "admin") redirect("/admin/dashboard");
  const thread = (await searchParams)?.thread;
  const initialThreadId = typeof thread === "string" ? thread : null;
  const link = "inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return <main className="flex h-[100dvh] flex-col bg-background text-foreground">
    <header className="flex min-h-16 items-center justify-between gap-2 border-b border-border px-3 sm:px-6">
      <Link href="/" className={link}><ArrowLeft size={18} aria-hidden="true" />Back to map</Link>
      <h1 className="text-lg font-semibold">Messages</h1>
      <div className="flex items-center gap-1">
        <MessagesAppearance />
        <Link href="/account" className={link}><UserRound size={18} aria-hidden="true" /><span className="hidden sm:inline">Account settings</span><span className="sr-only sm:hidden">Account settings</span></Link>
      </div>
    </header>
    <div className="min-h-0 flex-1 p-3 sm:p-6"><MessagingInbox userId={user.id} userRole="renter" initialThreadId={initialThreadId} /></div>
  </main>;
}
