/**
 * Small hand-rolled country list for the Local chat country picker — same
 * "reference data lives in the app, not a dependency" convention as
 * BREEDS_BY_SPECIES in lib/data.ts. ISO 3166-1 alpha-2 codes.
 */
export interface Country {
  code: string;
  name: string;
  flag: string;
}

function flagFor(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

const COUNTRY_CODES: [code: string, name: string][] = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["MX", "Mexico"],
  ["GB", "United Kingdom"],
  ["IE", "Ireland"],
  ["FR", "France"],
  ["DE", "Germany"],
  ["ES", "Spain"],
  ["PT", "Portugal"],
  ["IT", "Italy"],
  ["NL", "Netherlands"],
  ["BE", "Belgium"],
  ["CH", "Switzerland"],
  ["AT", "Austria"],
  ["SE", "Sweden"],
  ["NO", "Norway"],
  ["DK", "Denmark"],
  ["FI", "Finland"],
  ["PL", "Poland"],
  ["GR", "Greece"],
  ["TR", "Turkey"],
  ["RU", "Russia"],
  ["UA", "Ukraine"],
  ["IL", "Israel"],
  ["AE", "United Arab Emirates"],
  ["SA", "Saudi Arabia"],
  ["EG", "Egypt"],
  ["ZA", "South Africa"],
  ["NG", "Nigeria"],
  ["KE", "Kenya"],
  ["IN", "India"],
  ["PK", "Pakistan"],
  ["BD", "Bangladesh"],
  ["CN", "China"],
  ["JP", "Japan"],
  ["KR", "South Korea"],
  ["TW", "Taiwan"],
  ["HK", "Hong Kong"],
  ["SG", "Singapore"],
  ["MY", "Malaysia"],
  ["TH", "Thailand"],
  ["VN", "Vietnam"],
  ["PH", "Philippines"],
  ["ID", "Indonesia"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["BR", "Brazil"],
  ["AR", "Argentina"],
  ["CL", "Chile"],
  ["CO", "Colombia"],
  ["PE", "Peru"],
];

export const COUNTRIES: Country[] = COUNTRY_CODES.map(([code, name]) => ({ code, name, flag: flagFor(code) }));

export function countryByCode(code: string | null | undefined): Country | undefined {
  return code ? COUNTRIES.find((c) => c.code === code) : undefined;
}

export function searchCountries(query: string): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES;
  return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
}
