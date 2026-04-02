import { PricingTier } from '@prisma/client'

export function calculatePayment(
  entryTime: Date,
  exitTime: Date,
  tiers: PricingTier[],
): number {
  const durationMin = Math.ceil(
    (exitTime.getTime() - entryTime.getTime()) / 60000,
  )

  // Tierllarni fromMinutes bo'yicha tartiblash
  const sorted = [...tiers].sort((a, b) => a.fromMinutes - b.fromMinutes)

  for (const tier of sorted) {
    const from = tier.fromMinutes
    const to = tier.toMinutes ?? Infinity

    if (durationMin > from && durationMin <= to) {
      return tier.price
    }
  }

  // Agar hech bir tier mos kelmasa eng oxirgi tier narxi
  const lastTier = sorted[sorted.length - 1]
  return lastTier ? lastTier.price : 0
}

export function getDurationMinutes(entryTime: Date, exitTime: Date): number {
  return Math.ceil((exitTime.getTime() - entryTime.getTime()) / 60000)
}
