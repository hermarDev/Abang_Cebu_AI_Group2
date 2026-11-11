import Link from "next/link";
import type { ComponentProps } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/components/ui/cn";

export const logoutLinkClass =
  "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export interface LogoutLinkProps extends Omit<ComponentProps<typeof Link>, "href" | "children"> {
  href?: string;
  iconSize?: number;
  children?: React.ReactNode;
}

export function LogoutLink({ href = "/auth/logout", iconSize = 17, className, children = "Log out", ...props }: LogoutLinkProps) {
  return (
    <Link href={href} className={cn(logoutLinkClass, className)} {...props}>
      <LogOut size={iconSize} className="shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}
