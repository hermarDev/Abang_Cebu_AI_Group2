import type { UserRole } from '@/types/database';

export function getRequiredRole(pathname: string): UserRole | undefined {
  if (/^\/renter(?:\/|$)/.test(pathname)) return 'renter';
  if (/^\/landlord(?:\/|$)/.test(pathname)) return 'landlord';
  if (/^\/admin(?:\/|$)/.test(pathname)) return 'admin';
  return undefined;
}

export function getRoleHome(role: UserRole): string {
  return `/${role}/dashboard`;
}

export function isRoleAllowed(role: UserRole, pathname: string): boolean {
  return getRequiredRole(pathname) === role;
}
