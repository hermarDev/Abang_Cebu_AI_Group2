export function normalizePhilippineAccountMobile(value: string): string | null {
  const clean = value.replace(/[\s()-]/g, "");
  const match = /^(?:\+63|0)?(9\d{9})$/.exec(clean);
  return match ? `+63${match[1]}` : null;
}
