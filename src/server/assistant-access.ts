import { createClient } from "@/lib/supabase/server";

const responseHeaders = { "Cache-Control": "no-store" };

export async function getAssistantAccess(requireRenterAccount = false) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    if (requireRenterAccount) {
      return { response: Response.json({ error: "Sign in with a renter account to access chat history." }, { status: 401, headers: responseHeaders }) } as const;
    }
    return { supabase, user: null } as const;
  }

  if (authError) {
    return { response: Response.json({ error: "Your account could not be checked. Please try again." }, { status: 503, headers: responseHeaders }) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { response: Response.json({ error: "Your account could not be checked. Please try again." }, { status: 503, headers: responseHeaders }) } as const;
  }
  if (profile?.role !== "renter" || profile.is_suspended) {
    return { response: Response.json({ error: "Rental assistance is available to active renter accounts and guests." }, { status: 403, headers: responseHeaders }) } as const;
  }

  return { supabase, user } as const;
}
