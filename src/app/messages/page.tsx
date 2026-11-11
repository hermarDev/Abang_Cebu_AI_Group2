import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessagingInbox } from "@/features/messages/MessagingInbox";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages — AbangCebu", description: "Your conversations with landlords." };

export default async function MessagesPage(props: { searchParams?: Promise<{ thread?: string | string[] }> }): Promise<React.JSX.Element>;
export default async function MessagesPage(): Promise<React.JSX.Element>;
export default async function MessagesPage(props?: { searchParams?: Promise<{ thread?: string | string[] }> }): Promise<React.JSX.Element> {
  const searchParams = props?.searchParams;
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
    <header className="hidden sm:flex min-h-14 items-center justify-between border-b border-border bg-card px-3 sm:px-6">
      <div className="flex flex-1 items-center justify-start">
        <Link href="/" className={link}><ArrowLeft size={18} aria-hidden="true" />Back to map</Link>
      </div>
      <h1 className="text-base font-semibold text-foreground">Messages</h1>
      <div className="flex flex-1 items-center justify-end" aria-hidden="true" />
    </header>
    <div className="min-h-0 flex-1 p-0 sm:p-4 lg:p-6"><MessagingInbox userId={user.id} userRole="renter" initialThreadId={initialThreadId} /></div>
  </main>;
}
