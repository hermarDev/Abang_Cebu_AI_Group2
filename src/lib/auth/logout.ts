import { createClient } from "@/lib/supabase/server";

const SUPABASE_AUTH_COOKIE = /^sb-.+-auth-token(?:\.\d+)?(?:-code-verifier)?$/;

export interface LogoutCookieStore {
  getAll(): Array<{ name: string }>;
  delete(name: string): void;
}

export function clearSupabaseAuthCookies(cookieStore: LogoutCookieStore): void {
  for (const { name } of cookieStore.getAll()) {
    if (SUPABASE_AUTH_COOKIE.test(name)) cookieStore.delete(name);
  }
}

/** Revoke the current refresh token, then purge every Supabase auth cookie chunk. */
export async function logout(cookieStore: LogoutCookieStore): Promise<void> {
  let failure: unknown;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) failure = error;
  } catch (error) {
    failure = error;
  }

  for (const { name } of cookieStore.getAll()) {
    if (!SUPABASE_AUTH_COOKIE.test(name)) continue;
    try {
      cookieStore.delete(name);
    } catch (error) {
      failure ??= error;
    }
  }

  if (failure) throw failure;
}
