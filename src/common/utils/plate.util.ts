export type Country = 'UZ' | 'KG' | 'KZ' | 'RU' | 'TM' | 'TJ' | 'UNKNOWN'

const PLATE_PATTERNS: Record<string, RegExp> = {
  UZ: /^\d{2}[A-Z]\d{3}[A-Z]{2}$/,
  KG: /^[A-Z]\d{4}KG$/,
  KZ: /^\d{3}[A-Z]{3}\d{2}$/,
  TM: /^[A-Z]{2}\d{2}-\d{2}$/,
  TJ: /^\d{4}[A-Z]{2}\d{2}$/,
  RU: /^[А-ЯA-Z]\d{3}[А-ЯA-Z]{2}\d{2,3}$/,
}

export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/\s+/g, '').replace(/-/g, '')
}

export function detectCountry(plate: string): Country {
  const normalized = normalizePlate(plate)
  for (const [country, pattern] of Object.entries(PLATE_PATTERNS)) {
    if (pattern.test(normalized)) return country as Country
  }
  return 'UNKNOWN'
}
