import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as ExcelJS from 'exceljs'

export type ReportPeriod = 'daily' | 'weekly' | 'monthly'

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private getDateRange(period: ReportPeriod): { from: Date; to: Date } {
    const now = new Date()
    const from = new Date()
    const to = new Date()

    if (period === 'daily') {
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
    } else if (period === 'weekly') {
      const day = now.getDay()
      from.setDate(now.getDate() - day)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
    } else {
      from.setDate(1)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
    }

    return { from, to }
  }

  async getSummary(parkingId: string, period: ReportPeriod) {
    const { from, to } = this.getDateRange(period)

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        parkingId,
        status: 'EXITED',
        exitTime: { gte: from, lte: to },
      },
      include: { payment: true },
    })

    const totalIncome = vehicles.reduce((sum, v) => sum + (v.amount ?? 0), 0)
    const totalVehicles = vehicles.length

    return {
      period,
      from,
      to,
      totalVehicles,
      totalIncome,
      vehicles,
    }
  }

  async getSummaryByRegion(regionId: string, period: ReportPeriod) {
    const { from, to } = this.getDateRange(period)

    const parkings = await this.prisma.parking.findMany({
      where: { regionId },
    })

    const result = await Promise.all(
      parkings.map(async (parking) => {
        const vehicles = await this.prisma.vehicle.findMany({
          where: {
            parkingId: parking.id,
            status: 'EXITED',
            exitTime: { gte: from, lte: to },
          },
        })
        const totalIncome = vehicles.reduce((sum, v) => sum + (v.amount ?? 0), 0)
        return {
          parking,
          totalVehicles: vehicles.length,
          totalIncome,
        }
      }),
    )

    return { period, from, to, parkings: result }
  }

  async generateExcel(parkingId: string, period: ReportPeriod): Promise<Buffer> {
    const { from, to } = this.getDateRange(period)

    const parking = await this.prisma.parking.findUnique({
      where: { id: parkingId },
      include: { region: true },
    })

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        parkingId,
        status: 'EXITED',
        exitTime: { gte: from, lte: to },
      },
      orderBy: { exitTime: 'desc' },
      include: { payment: true },
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Hisobot')

    // Header
    sheet.mergeCells('A1:G1')
    sheet.getCell('A1').value = `ParkFlow — ${parking?.name} | ${period.toUpperCase()} hisobot`
    sheet.getCell('A1').font = { bold: true, size: 14 }
    sheet.getCell('A1').alignment = { horizontal: 'center' }

    sheet.mergeCells('A2:G2')
    sheet.getCell('A2').value = `${from.toLocaleDateString()} — ${to.toLocaleDateString()}`
    sheet.getCell('A2').alignment = { horizontal: 'center' }

    sheet.addRow([])

    // Column headers
    const headerRow = sheet.addRow([
      '№', 'Plaka', 'Davlat', 'Kirish vaqti', 'Chiqish vaqti', 'Muddat (min)', 'To\'lov (so\'m)'
    ])
    headerRow.font = { bold: true }
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    })

    // Data rows
    vehicles.forEach((v, i) => {
      sheet.addRow([
        i + 1,
        v.plateNumber,
        v.country,
        v.entryTime.toLocaleString(),
        v.exitTime?.toLocaleString() ?? '-',
        v.durationMin ?? 0,
        v.amount ?? 0,
      ])
    })

    // Total row
    const totalRow = sheet.addRow([
      '', '', '', '', 'JAMI:', vehicles.length + ' ta',
      vehicles.reduce((sum, v) => sum + (v.amount ?? 0), 0) + ' so\'m',
    ])
    totalRow.font = { bold: true }

    // Column widths
    sheet.columns = [
      { width: 5 }, { width: 15 }, { width: 10 },
      { width: 20 }, { width: 20 }, { width: 15 }, { width: 15 },
    ]

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }
}
