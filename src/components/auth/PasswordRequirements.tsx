import { Check, Circle } from "lucide-react";
import { REGISTRATION_VALIDATION_RULES } from "@/types/auth";

export interface PasswordRequirementsProps {
  password: string;
  id: string;
  emptyError?: boolean;
  confirmPassword?: string;
}

export function PasswordRequirements({
  password,
  id,
  emptyError = false,
  confirmPassword,
}: PasswordRequirementsProps) {
  const policy = REGISTRATION_VALIDATION_RULES.password;

  const requirements = [
    {
      label: `The password must be at least ${policy.minLength} characters.`,
      met: password.length >= policy.minLength && password.length <= policy.maxLength,
    },
    {
      label: "The password must contain at least one uppercase and one lowercase letter.",
      met: policy.classes.uppercase.test(password) && policy.classes.lowercase.test(password),
    },
    {
      label: "The password must contain at least one symbol.",
      met: policy.classes.symbol.test(password),
    },
    {
      label: "The password must contain at least one number.",
      met: policy.classes.digit.test(password),
    },
    ...(confirmPassword !== undefined
      ? [
          {
            label: "The password and confirmation must match.",
            met: password.length > 0 && password === confirmPassword,
          },
        ]
      : []),
  ];

  return (
    <div id={id} className="mt-2 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Password requirements</p>
      {emptyError && <p className="text-destructive">Enter a new password.</p>}
      <ul className="mt-1 space-y-1">
        {requirements.map(({ label, met }) => (
          <li
            key={label}
            className={met ? "flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400" : "flex items-start gap-1.5 text-muted-foreground"}
          >
            {met
              ? (
                  <span
                    role="img"
                    aria-label="Requirement met"
                    className="mt-px grid size-3.5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white"
                  >
                    <Check aria-hidden="true" className="size-2.5" strokeWidth={3} />
                  </span>
                )
              : (
                  <Circle
                    role="img"
                    aria-label="Requirement not met"
                    aria-hidden="true"
                    className="mt-px size-3.5 shrink-0 text-muted-foreground"
                  />
                )}
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
