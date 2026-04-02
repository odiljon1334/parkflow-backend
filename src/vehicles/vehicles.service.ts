import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EntryDto } from './dto/entry.dto'
import { ExitDto } from './dto/exit.dto'
import { normalizePlate, detectCountry } from '../common/utils/plate.util'
import { calculateAmount, getDurationMinutes, formatDuration } from '../common/utils/pricing.util'
import { ParkingGateway } from '../gateway/parking.gateway'
import {
  EntryMethod,
  PaymentMethod,
  SessionStatus,
  PaymentStatus,
  SessionEventType,
} from '@prisma/client'

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma:  PrismaService,
    private readonly gateway: ParkingGateway,
  ) {}

  // ─── Hozir ichkaridagi mashinalar ─────────────────────────────────────────
  async getActiveSessions(parkingId: string) {
    return this.prisma.vehicleSession.findMany({
      where:   { parkingId, status: SessionStatus.ACTIVE },
      include: { entryCamera: true },
      orderBy: { entryTime: 'desc' },
    })
  }

  // ─── ENTRY ────────────────────────────────────────────────────────────────
  async entry(dto: EntryDto) {
    const plate   = normalizePlate(dto.plateNumber)
    const country = detectCountry(plate)

    // Allaqachon ichkaridami?
    const existing = await this.prisma.vehicleSession.findFirst({
      where: { parkingId: dto.parkingId, plateNumber: plate, status: SessionStatus.ACTIVE },
    })
    if (existing) {
      throw new BadRequestException(
        `${plate} raqamli mashina allaqachon parkingda (session: ${existing.id})`,
      )
    }

    // Parking va tariff plan
    const parking = await this.prisma.parking.findUnique({
      where:   { id: dto.parkingId },
      include: { tariffPlan: { include: { rules: true } } },
    })
    if (!parking) throw new NotFoundException('Parking topilmadi')

    const session = await this.prisma.vehicleSession.create({
      data: {
        plateNumber:   plate,
        country,
        confidence:    dto.confidence,
        parkingId:     dto.parkingId,
        regionId:      parking.regionId,
        entryCameraId: dto.cameraId,
        entryMethod:   (dto.method as EntryMethod) ?? EntryMethod.AUTO,
        entryImageUrl: dto.entryImageUrl,
        tariffPlanId:  parking.tariffPlanId,
        status:        SessionStatus.ACTIVE,
        paymentStatus: PaymentStatus.UNPAID,
        events: {
          create: {
            type: dto.method === EntryMethod.MANUAL
              ? SessionEventType.MANUAL_ENTRY
              : SessionEventType.ENTRY_CAPTURED,
            payload:   { plate, cameraId: dto.cameraId, confidence: dto.confidence },
            createdBy: 'SYSTEM',
          },
        },
      },
      include: { entryCamera: true },
    })

    this.gateway.emitVehicleEntry(dto.parkingId, session)
    await this.broadcastCount(dto.parkingId)

    return session
  }

  // ─── EXIT ─────────────────────────────────────────────────────────────────
  async exit(dto: ExitDto) {
    const plate = normalizePlate(dto.plateNumber)

    const session = await this.prisma.vehicleSession.findFirst({
      where:   { parkingId: dto.parkingId, plateNumber: plate, status: SessionStatus.ACTIVE },
      include: { parking: { include: { tariffPlan: { include: { rules: true } } } } },
    })
    if (!session) throw new NotFoundException(`${plate} raqamli mashina parkingda topilmadi`)

    const exitTime        = new Date()
    const durationMinutes = getDurationMinutes(session.entryTime, exitTime)
    const rules           = session.parking.tariffPlan?.rules ?? []

    if (!rules.length) {
      throw new BadRequestException('Bu parking uchun tarif jadvali sozlanmagan')
    }

    const totalAmount = calculateAmount(durationMinutes, rules)

    const updated = await this.prisma.vehicleSession.update({
      where: { id: session.id },
      data: {
        exitTime,
        durationMinutes,
        status:        SessionStatus.CLOSED,
        exitMethod:    (dto.method as EntryMethod) ?? EntryMethod.AUTO,
        exitCameraId:  dto.cameraId,
        exitImageUrl:  dto.exitImageUrl,
        totalAmount,
        paymentStatus: PaymentStatus.PAID,
        payment: {
          create: {
            amount: totalAmount,
            method: (dto.paymentMethod as PaymentMethod) ?? PaymentMethod.CASH,
            status: PaymentStatus.PAID,
            paidBy: dto.operatorId ?? 'AUTO',
          },
        },
        events: {
          create: {
            type: dto.method === EntryMethod.MANUAL
              ? SessionEventType.MANUAL_EXIT
              : SessionEventType.EXIT_CAPTURED,
            payload:   { durationMinutes, totalAmount, cameraId: dto.cameraId },
            createdBy: dto.operatorId ?? 'SYSTEM',
          },
        },
      },
      include: { payment: true, exitCamera: true },
    })

    this.gateway.emitVehicleExit(dto.parkingId, updated)
    await this.broadcastCount(dto.parkingId)

    return updated
  }

  // ─── Narx preview ─────────────────────────────────────────────────────────
  async previewPrice(parkingId: string, plate: string) {
    const normalized = normalizePlate(plate)

    const session = await this.prisma.vehicleSession.findFirst({
      where:   { parkingId, plateNumber: normalized, status: SessionStatus.ACTIVE },
      include: { parking: { include: { tariffPlan: { include: { rules: true } } } } },
    })
    if (!session) throw new NotFoundException('Mashina topilmadi')

    const now             = new Date()
    const durationMinutes = getDurationMinutes(session.entryTime, now)
    const rules           = session.parking.tariffPlan?.rules ?? []
    const totalAmount     = calculateAmount(durationMinutes, rules)

    return { session, durationMinutes, durationText: formatDuration(durationMinutes), totalAmount }
  }

  // ─── Manual yopish (LOST) ─────────────────────────────────────────────────
  async manualClose(sessionId: string, operatorId: string, note?: string) {
    const session = await this.prisma.vehicleSession.findUnique({
      where:   { id: sessionId },
      include: { parking: { include: { tariffPlan: { include: { rules: true } } } } },
    })
    if (!session) throw new NotFoundException('Session topilmadi')
    if (session.status !== SessionStatus.ACTIVE)
      throw new BadRequestException('Session allaqachon yopilgan')

    const exitTime        = new Date()
    const durationMinutes = getDurationMinutes(session.entryTime, exitTime)
    const rules           = session.parking.tariffPlan?.rules ?? []
    const totalAmount     = calculateAmount(durationMinutes, rules)

    return this.prisma.vehicleSession.update({
      where: { id: sessionId },
      data: {
        exitTime,
        durationMinutes,
        totalAmount,
        status:        SessionStatus.LOST,
        paymentStatus: PaymentStatus.UNPAID,
        note,
        events: {
          create: {
            type:      SessionEventType.SESSION_CLOSED,
            payload:   { reason: 'manual_close', note },
            createdBy: operatorId,
          },
        },
      },
    })
  }

  // ─── To'lanmagan sessionlar ────────────────────────────────────────────────
  async getUnpaidSessions(parkingId: string) {
    return this.prisma.vehicleSession.findMany({
      where: {
        parkingId,
        paymentStatus: PaymentStatus.UNPAID,
        status:        { not: SessionStatus.ACTIVE },
      },
      orderBy: { exitTime: 'desc' },
    })
  }

  // ─── Barcha sessionlar ────────────────────────────────────────────────────
  async findAll(parkingId: string, from?: Date, to?: Date) {
    return this.prisma.vehicleSession.findMany({
      where: {
        parkingId,
        ...(from || to ? { entryTime: { gte: from, lte: to } } : {}),
      },
      include: { payment: true, entryCamera: true, exitCamera: true },
      orderBy: { entryTime: 'desc' },
      take:    100,
    })
  }

  // ─── Private ──────────────────────────────────────────────────────────────
  private async broadcastCount(parkingId: string) {
    const count = await this.prisma.vehicleSession.count({
      where: { parkingId, status: SessionStatus.ACTIVE },
    })
    this.gateway.emitInsideCount(parkingId, count)
  }
}
