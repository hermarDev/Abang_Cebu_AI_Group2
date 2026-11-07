import { REGISTRATION_VALIDATION_RULES } from "@/types/auth";

export function PasswordRequirements({ password, id, emptyError = false }: { password: string; id: string; emptyError?: boolean }) {
  const policy = REGISTRATION_VALIDATION_RULES.password;
  const symbols = Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32))
    .filter((character) => policy.classes.symbol.test(character)).join("");
  const requirements = [
    { label: `${policy.minLength}–${policy.maxLength} characters`, met: password.length >= policy.minLength && password.length <= policy.maxLength },
    { label: "Uppercase letter", met: policy.classes.uppercase.test(password) },
    { label: "Lowercase letter", met: policy.classes.lowercase.test(password) },
    { label: "Number", met: policy.classes.digit.test(password) },
    { label: `Symbol (${symbols})`, met: policy.classes.symbol.test(password) },
  ];

  return <div id={id} className="mt-2 text-xs text-muted-foreground">
    <p className="font-medium text-foreground">Password requirements</p>
    {emptyError && <p className="text-destructive">Enter a new password.</p>}
    <ul className="mt-1 space-y-1">
      {requirements.map(({ label, met }) => <li key={label} className={met ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
        <span aria-hidden="true">{met ? "✓" : "○"}</span>{" "}
        <span className="sr-only">{met ? "Met: " : "Not met: "}</span>{label}
      </li>)}
    </ul>
  </div>;
}
