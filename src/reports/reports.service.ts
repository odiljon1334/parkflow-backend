import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SessionStatus } from '@prisma/client'
import * as ExcelJS from 'exceljs'

export type ReportPeriod = 'daily' | 'weekly' | 'monthly'

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Sana oralig'ini hisoblash ────────────────────────────────────────────
  getDateRange(period: ReportPeriod): { from: Date; to: Date } {
    const now  = new Date()
    const from = new Date()
    const to   = new Date()

    if (period === 'daily') {
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
    } else if (period === 'weekly') {
      from.setDate(now.getDate() - now.getDay())
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
    } else {
      from.setDate(1)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
    }

    return { from, to }
  }

  // ─── Parking bo'yicha hisobot ─────────────────────────────────────────────
  async getSummary(parkingId: string, period: ReportPeriod) {
    const { from, to } = this.getDateRange(period)

    const sessions = await this.prisma.vehicleSession.findMany({
      where: {
        parkingId,
        status:   SessionStatus.CLOSED,
        exitTime: { gte: from, lte: to },
      },
      include: { payment: true },
    })

    const totalIncome   = sessions.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0)
    const totalSessions = sessions.length

    return { period, from, to, totalSessions, totalIncome, sessions }
  }

  // ─── Region bo'yicha hisobot ──────────────────────────────────────────────
  async getSummaryByRegion(regionId: string, period: ReportPeriod) {
    const { from, to } = this.getDateRange(period)

    const parkings = await this.prisma.parking.findMany({ where: { regionId } })

    const result = await Promise.all(
      parkings.map(async (parking) => {
        const sessions = await this.prisma.vehicleSession.findMany({
          where: {
            parkingId: parking.id,
            status:    SessionStatus.CLOSED,
            exitTime:  { gte: from, lte: to },
          },
        })
        const totalIncome = sessions.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0)
        return { parking, totalSessions: sessions.length, totalIncome }
      }),
    )

    return { period, from, to, parkings: result }
  }

  // ─── Barcha regionlar hisoboti (SuperAdmin) ───────────────────────────────
  async getGlobalSummary(period: ReportPeriod) {
    const { from, to } = this.getDateRange(period)

    const regions = await this.prisma.region.findMany({
      include: { parkings: true },
    })

    const result = await Promise.all(
      regions.map(async (region) => {
        const parkingIds = region.parkings.map((p) => p.id)
        const sessions = await this.prisma.vehicleSession.findMany({
          where: {
            parkingId: { in: parkingIds },
            status:    SessionStatus.CLOSED,
            exitTime:  { gte: from, lte: to },
          },
        })
        const totalIncome = sessions.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0)
        return { region, totalSessions: sessions.length, totalIncome }
      }),
    )

    const grandTotal = result.reduce((sum, r) => sum + r.totalIncome, 0)
    return { period, from, to, regions: result, grandTotal }
  }

  // ─── Excel export ─────────────────────────────────────────────────────────
  async generateExcel(parkingId: string, period: ReportPeriod): Promise<Buffer> {
    const { from, to } = this.getDateRange(period)

    const parking = await this.prisma.parking.findUnique({
      where:   { id: parkingId },
      include: { region: true },
    })

    const sessions = await this.prisma.vehicleSession.findMany({
      where: {
        parkingId,
        status:   SessionStatus.CLOSED,
        exitTime: { gte: from, lte: to },
      },
      orderBy: { exitTime: 'desc' },
      include: { payment: true },
    })

    const workbook = new ExcelJS.Workbook()
    const sheet    = workbook.addWorksheet('Hisobot')

    // ── Sarlavha ──
    sheet.mergeCells('A1:H1')
    sheet.getCell('A1').value     = `ParkFlow — ${parking?.name ?? ''} | ${period.toUpperCase()} hisobot`
    sheet.getCell('A1').font      = { bold: true, size: 14 }
    sheet.getCell('A1').alignment = { horizontal: 'center' }

    sheet.mergeCells('A2:H2')
    sheet.getCell('A2').value     = `${from.toLocaleDateString('uz-UZ')} — ${to.toLocaleDateString('uz-UZ')}`
    sheet.getCell('A2').alignment = { horizontal: 'center' }

    sheet.addRow([])

    // ── Ustun sarlavhalari ──
    const headerRow = sheet.addRow([
      '№', 'Plaka', 'Davlat', 'Kirish', 'Chiqish', 'Muddat', "To'lov turi", "Summa (so'm)",
    ])
    headerRow.eachCell((cell) => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.alignment = { horizontal: 'center' }
    })

    // ── Ma'lumotlar ──
    sessions.forEach((s, i) => {
      const mins  = s.durationMinutes ?? 0
      const hours = Math.floor(mins / 60)
      const min   = mins % 60
      const dur   = hours > 0 ? `${hours}s ${min}d` : `${min}d`

      sheet.addRow([
        i + 1,
        s.plateNumber,
        s.country,
        s.entryTime.toLocaleString('uz-UZ'),
        s.exitTime?.toLocaleString('uz-UZ') ?? '-',
        dur,
        s.payment?.method ?? '-',
        s.totalAmount ?? 0,
      ])
    })

    // ── Jami qator ──
    const totalAmount = sessions.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0)
    const totalRow    = sheet.addRow(['', '', '', '', '', 'JAMI:', `${sessions.length} ta`, `${totalAmount.toLocaleString()} so'm`])
    totalRow.font     = { bold: true }

    // ── Ustun kengliklari ──
    sheet.columns = [
      { width: 5 }, { width: 15 }, { width: 10 },
      { width: 20 }, { width: 20 }, { width: 12 }, { width: 14 }, { width: 16 },
    ]

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }
}
