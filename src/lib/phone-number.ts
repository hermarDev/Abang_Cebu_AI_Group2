import { isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export function parseValidPhoneNumber(value: string, countryCode: string) {
  const maxDigits = countryCode === "PH" ? 11 : 15;
  if (!/^\d{1,15}$/.test(value) || value.length > maxDigits || !isSupportedCountry(countryCode)) return null;

  const phoneNumber = parsePhoneNumberFromString(value, { defaultCountry: countryCode as CountryCode, extract: false });
  if (!phoneNumber?.isValid() || phoneNumber.country !== countryCode) return null;
  return phoneNumber;
}

export function normalizeInternationalPhoneNumber(value: string, countryCode: string): string | null {
  return parseValidPhoneNumber(value, countryCode)?.number ?? null;
}