import { RestoredFinderShell } from "@/features/map/RestoredFinderShell";

import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return <RestoredFinderShell authenticated={!error && Boolean(user)} />;
}
