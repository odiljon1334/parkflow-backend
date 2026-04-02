import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateParkingDto } from './dto/create-parking.dto'

@Injectable()
export class ParkingsService {
  constructor(private prisma: PrismaService) {}

  findAll(regionId?: string) {
    return this.prisma.parking.findMany({
      where: regionId ? { regionId } : {},
      include: {
        region: true,
        _count: { select: { vehicles: { where: { status: 'INSIDE' } } } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findOne(id: string) {
    const parking = await this.prisma.parking.findUnique({
      where: { id },
      include: {
        region: true,
        cameras: true,
        pricingTiers: { orderBy: { fromMinutes: 'asc' } },
        _count: { select: { vehicles: { where: { status: 'INSIDE' } } } },
      },
    })
    if (!parking) throw new NotFoundException('Parking topilmadi')
    return parking
  }

  create(dto: CreateParkingDto) {
    return this.prisma.parking.create({
      data: {
        name: dto.name,
        address: dto.address,
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
    return this.prisma.parking.delete({ where: { id } })
  }
}
