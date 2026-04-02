import { TariffRule } from '@prisma/client'

/**
 * Strategy Pattern — Tarif hisoblash
 *
 * Qoidalar:
 *   fromMinutes <= duration < toMinutes  →  shu narx qaytariladi
 *   toMinutes null (∞)  →  oxirgi rule sutkalik formula bilan
 *
 * Misol (default tarif):
 *   0   → 180  = 5_000
 *   180 → 360  = 10_000
 *   360 → 1440 = 15_000
 *   1440 → ∞   = ceil(durationMinutes / 1440) * 15_000
 */
export function calculateAmount(durationMinutes: number, rules: TariffRule[]): number {
  if (!rules.length) return 0

  const sorted = [...rules].sort((a, b) => a.fromMinutes - b.fromMinutes)

  for (const rule of sorted) {
    const to = rule.toMinutes ?? Infinity
    if (durationMinutes >= rule.fromMinutes && durationMinutes < to) {
      return rule.price
    }
  }

  // Oxirgi rule — sutkalik formula
  const lastRule = sorted[sorted.length - 1]
  const dayMinutes = lastRule.fromMinutes > 0 ? lastRule.fromMinutes : 1440
  return Math.ceil(durationMinutes / dayMinutes) * lastRule.price
}

export function getDurationMinutes(entryTime: Date, exitTime: Date): number {
  return Math.ceil((exitTime.getTime() - entryTime.getTime()) / 60000)
}

export function formatDuration(minutes: number): string {
  const days  = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins  = minutes % 60

  if (days > 0)  return `${days}k ${hours}s ${mins}d`
  if (hours > 0) return `${hours}s ${mins}d`
  return `${mins} daqiqa`
}
