import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });

async function access(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: reply("Sign in required.", 401) } as const;
  if (request.headers.get("x-expected-user-id") !== user.id) return { response: reply("Your account changed. Please refresh and try again.", 409) } as const;
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
  if (profileError) return { response: reply("Your account could not be checked. Please try again.", 503) } as const;
  if (profile?.role !== "landlord" || profile.is_suspended) return { response: reply("Landlord account required.", 403) } as const;
  return { supabase, user } as const;
}

export async function GET(request: Request) {
  const session = await access(request);
  if ("response" in session && session.response) return session.response;
  const operationId = new URL(request.url).searchParams.get("operationId");
  if (operationId !== null && !uuid.test(operationId)) return reply("Invalid operation id.", 400);
  const { data, error } = await session.supabase.rpc("landlord_property_status", { p_operation_id: operationId });
  if (error) return reply("Status could not be loaded. Please retry.", 503);
  return Response.json(data ?? {}, { headers });
}
