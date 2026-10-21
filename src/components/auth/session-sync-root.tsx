import { Suspense } from "react";
import SessionSync from "@/components/auth/session-sync";

export default function SessionSyncRoot() {
  return (
    <Suspense fallback={null}>
      <SessionSync />
    </Suspense>
  );
}
