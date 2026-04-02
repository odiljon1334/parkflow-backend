import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EntryDto } from './dto/entry.dto'
import { ExitDto } from './dto/exit.dto'
import { normalizePlate, detectCountry } from '../common/utils/plate.util'
import { calculatePayment, getDurationMinutes } from '../common/utils/pricing.util'
import { ParkingGateway } from '../gateway/parking.gateway'
import { EntryMethod, PaymentMethod } from '@prisma/client'

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private gateway: ParkingGateway,
  ) {}

  async getInsideVehicles(parkingId: string) {
    return this.prisma.vehicle.findMany({
      where: { parkingId, status: 'INSIDE' },
      orderBy: { entryTime: 'desc' },
    })
  }

  async entry(dto: EntryDto) {
    const plate = normalizePlate(dto.plateNumber)
    const country = detectCountry(plate)

    const existing = await this.prisma.vehicle.findFirst({
      where: { parkingId: dto.parkingId, plateNumber: plate, status: 'INSIDE' },
    })
    if (existing) {
      throw new BadRequestException(`${plate} raqamli mashina allaqachon parkingda`)
    }

    const vehicle = await this.prisma.vehicle.create({
      data: {
        plateNumber: plate,
        country,
        parkingId: dto.parkingId,
        entryMethod: (dto.method as EntryMethod) ?? EntryMethod.AUTO,
      },
    })

    // Real-time broadcast
    this.gateway.emitVehicleEntry(dto.parkingId, vehicle)
    const count = await this.prisma.vehicle.count({
      where: { parkingId: dto.parkingId, status: 'INSIDE' },
    })
    this.gateway.emitInsideCount(dto.parkingId, count)

    return vehicle
  }

  async exit(dto: ExitDto) {
    const plate = normalizePlate(dto.plateNumber)

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { parkingId: dto.parkingId, plateNumber: plate, status: 'INSIDE' },
    })
    if (!vehicle) throw new NotFoundException(`${plate} raqamli mashina parkingda topilmadi`)

    const exitTime = new Date()
    const durationMin = getDurationMinutes(vehicle.entryTime, exitTime)

    const tiers = await this.prisma.pricingTier.findMany({
      where: { parkingId: dto.parkingId },
    })
    if (tiers.length === 0) {
      throw new BadRequestException('Bu parking uchun narx jadvali sozlanmagan')
    }

    const amount = calculatePayment(vehicle.entryTime, exitTime, tiers)

    const updated = await this.prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        exitTime,
        durationMin,
        status: 'EXITED',
        exitMethod: (dto.method as EntryMethod) ?? EntryMethod.AUTO,
        amount,
        payment: {
          create: {
            amount,
            method: (dto.paymentMethod as PaymentMethod) ?? PaymentMethod.CASH,
          },
        },
      },
      include: { payment: true },
    })

    // Real-time broadcast
    this.gateway.emitVehicleExit(dto.parkingId, updated)
    const count = await this.prisma.vehicle.count({
      where: { parkingId: dto.parkingId, status: 'INSIDE' },
    })
    this.gateway.emitInsideCount(dto.parkingId, count)

    return updated
  }

  async findByPlate(parkingId: string, plate: string) {
    const normalized = normalizePlate(plate)
    return this.prisma.vehicle.findFirst({
      where: { parkingId, plateNumber: normalized, status: 'INSIDE' },
    })
  }

  async previewPrice(parkingId: string, plate: string) {
    const normalized = normalizePlate(plate)
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { parkingId, plateNumber: normalized, status: 'INSIDE' },
    })
    if (!vehicle) throw new NotFoundException('Mashina topilmadi')

    const tiers = await this.prisma.pricingTier.findMany({ where: { parkingId } })
    const now = new Date()
    const amount = calculatePayment(vehicle.entryTime, now, tiers)
    const durationMin = getDurationMinutes(vehicle.entryTime, now)

    return { vehicle, durationMin, amount }
  }
}
