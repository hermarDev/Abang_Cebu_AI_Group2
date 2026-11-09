"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Empty } from "@/components/ui/Empty";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { AdminAuditEntries, type AuditEntry } from "./AdminAuditEntries";
import { adminCall } from "./admin-api";

const targetOptions = [{ value: "", label: "All" }, { value: "property", label: "Property" }, { value: "account", label: "Account" }, { value: "report", label: "Report" }];

export function AdminAuditLog({ userId }: { userId: string }) {
  const [targetType, setTargetType] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    // Timer callback keeps the loading reset out of the effect body (react-hooks/set-state-in-effect).
    const timer = setTimeout(async () => {
      setError(null);
      setEntries(null);
      const result = await adminCall<{ entries?: AuditEntry[] }>(`/api/admin/audit${targetType ? `?targetType=${targetType}` : ""}`, userId, undefined, abort.signal);
      if (abort.signal.aborted) return;
      if (result.ok) setEntries(Array.isArray(result.data.entries) ? result.data.entries : []);
      else setError(result.message);
    }, 0);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [targetType, userId]);

  const totalPages = entries ? Math.max(1, Math.ceil(entries.length / pageSize)) : 1;
  const validPage = Math.min(page, totalPages);
  const paginatedEntries = entries ? entries.slice((validPage - 1) * pageSize, validPage * pageSize) : [];

  return <section aria-label="Audit log" className="grid gap-4">
    <div className="max-w-56"><Select aria-label="Filter by target type" options={targetOptions} value={targetType} onValueChange={(val) => { setTargetType(val); setPage(1); }} /></div>
    {error ? <Alert variant="error">{error}</Alert>
      : entries === null ? <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      : entries.length === 0 ? <Empty>No audit entries yet.</Empty>
      : <>
          <AdminAuditEntries entries={paginatedEntries} />
          {entries.length >= 50 && <p className="m-0 text-xs text-muted-foreground">Showing the 50 most recent moderation events.</p>}
          <Pagination currentPage={page} totalPages={totalPages} totalItems={entries.length} pageSize={pageSize} onPageChange={setPage} />
        </>}
  </section>;
}
