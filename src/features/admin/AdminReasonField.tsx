import { reasonProblem, REASON_MAX } from "./admin-api";

export function AdminReasonField({ id, label, value, min, onChange, disabled }: { id: string; label: string; value: string; min: number; onChange: (value: string) => void; disabled?: boolean }) {
  const problem = value ? reasonProblem(value, min) : null;
  return <div className="grid gap-2">
    <label htmlFor={id} className="text-sm font-medium">{label}</label>
    <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} rows={4} maxLength={REASON_MAX} aria-invalid={problem ? true : undefined} aria-describedby={`${id}-hint`}
      className="min-h-24 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive" />
    <p id={`${id}-hint`} className={`m-0 text-xs ${problem ? "text-destructive" : "text-muted-foreground"}`}>{problem ?? `${min} to ${REASON_MAX} characters. Saved to the audit log.`}</p>
  </div>;
}
