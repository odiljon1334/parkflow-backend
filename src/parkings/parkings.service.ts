import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateParkingDto } from './dto/create-parking.dto'
import { SessionStatus } from '@prisma/client'

@Injectable()
export class ParkingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(regionId?: string) {
    return this.prisma.parking.findMany({
      where:   regionId ? { regionId } : {},
      include: {
        region:    true,
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findOne(id: string) {
    const parking = await this.prisma.parking.findUnique({
      where:   { id },
      include: {
        region:     true,
        cameras:    true,
        tariffPlan: { include: { rules: { orderBy: { fromMinutes: 'asc' } } } },
        _count:     { select: { sessions: true } },
      },
    })
    if (!parking) throw new NotFoundException('Parking topilmadi')

    // Hozir ichkaridagi mashinalar sonini alohida hisoblash
    const activeCount = await this.prisma.vehicleSession.count({
      where: { parkingId: id, status: SessionStatus.ACTIVE },
    })

    return { ...parking, activeCount }
  }

  create(dto: CreateParkingDto) {
    return this.prisma.parking.create({
      data: {
        name:     dto.name,
        address:  dto.address,
        capacity: dto.capacity,
        regionId: dto.regionId,
      },
    })
  }

  async update(id: string, dto: Partial<CreateParkingDto>) {
    await this.findOne(id)
    return this.prisma.parking.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    // Soft delete
    return this.prisma.parking.update({ where: { id }, data: { isActive: false } })
  }
}
