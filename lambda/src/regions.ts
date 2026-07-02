/** ISO 3166-1 alpha-2 → full country/territory name in English. */
const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function countryCodeToName(isoCountryCode: string | undefined): string | undefined {
  if (!isoCountryCode) return undefined;
  const code = isoCountryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return undefined;
  try {
    return displayNames.of(code);
  } catch {
    return undefined;
  }
}
