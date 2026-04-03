export type Country = 'UZ' | 'KG' | 'KZ' | 'RU' | 'TM' | 'TJ' | 'UNKNOWN'

const PLATE_PATTERNS: Record<string, RegExp> = {
  UZ: /^\d{2}[A-Z]\d{3}[A-Z]{2}$/,           // 60R559SA
  KG: /^\d{2}\d{3}[A-Z]{3}$/,                 // 04783AOV
  KZ: /^\d{3}[A-Z]{3}\d{2}$/,                 // 123ABC02
  TM: /^[A-Z]{2}\d{4}$/,                      // AB1234
  TJ: /^\d{4}[A-Z]{2}\d{2}$/,                 // 1234AB56
  RU: /^[A-ZА-Я]\d{3}[A-ZА-Я]{2}\d{2,3}$/,  // A123BC78
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
