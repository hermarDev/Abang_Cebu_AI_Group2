import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SupportCenterClient } from "@/features/support/SupportCenterClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Support — AbangCebu",
  description: "Submit a support inquiry, report a listing or safety issue, or track existing support requests.",
};

interface SupportPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SupportPage(props: SupportPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const highlightTicketId =
    typeof searchParams.ticket === "string" ? searchParams.ticket.trim() : null;
  const guestToken =
    typeof searchParams.token === "string" ? searchParams.token.trim() : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | null = null;
  let isSuspended = false;
  let initialName = "";
  let initialEmail = "";

  if (user) {
    initialEmail = user.email ?? "";

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, is_suspended")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      userRole = profile.role ?? null;
      isSuspended = Boolean(profile.is_suspended);
      initialName = profile.full_name ?? "";
    }
  }

  const backHref =
    !isSuspended && userRole === "admin"
      ? "/admin/dashboard"
      : !isSuspended && userRole === "landlord"
        ? "/landlord/dashboard"
        : "/";

  const backLabel =
    !isSuspended && userRole === "admin"
      ? "Back to admin workspace"
      : !isSuspended && userRole === "landlord"
        ? "Back to workspace"
        : "Back to map";

  const turnstileRequired = Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());

  return (
    <SupportCenterClient
      authenticated={Boolean(user)}
      userId={user?.id ?? null}
      initialName={initialName}
      initialEmail={initialEmail}
      userRole={userRole}
      backHref={backHref}
      backLabel={backLabel}
      turnstileRequired={turnstileRequired}
      highlightTicketId={highlightTicketId}
      guestToken={guestToken}
    />
  );
}
