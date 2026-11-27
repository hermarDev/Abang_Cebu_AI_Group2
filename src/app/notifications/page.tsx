import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadProfile } from "@/lib/supabase/profile";
import { NotificationsHubContent } from "@/features/notifications/NotificationsHubContent";
import type { UserRole } from "@/types/database";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Notifications — AbangCebu AI",
  description: "View and manage your alerts, messages, inquiries, and listing updates.",
};

export default async function NotificationsPage() {
  const { user, profile, profileError } = await loadProfile();

  if (!user) {
    redirect("/login?next=%2Fnotifications");
  }

  if (profileError) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background p-5 text-foreground">
        <section
          className="max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Notifications are unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We could not verify your account. Please reload and try again.
          </p>
        </section>
      </main>
    );
  }

  if (profile?.is_suspended) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background p-5 text-foreground">
        <section
          className="max-w-md rounded-2xl border border-destructive/40 bg-card p-6 text-card-foreground shadow-sm"
          role="alert"
        >
          <h1 className="text-xl font-semibold text-destructive">Account Suspended</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Notifications are unavailable for this account.
          </p>
        </section>
      </main>
    );
  }

  return (
    <NotificationsHubContent
      userId={user.id}
      userRole={profile?.role as UserRole | null}
    />
  );
}
