import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SetPricingDto } from './dto/set-pricing.dto'

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async getTiers(parkingId: string) {
    return this.prisma.pricingTier.findMany({
      where: { parkingId },
      orderBy: { fromMinutes: 'asc' },
    })
  }

  // Barcha tierllarni o'chirib qaytadan saqlash (set operatsiyasi)
  async setTiers(parkingId: string, dto: SetPricingDto) {
    const parking = await this.prisma.parking.findUnique({ where: { id: parkingId } })
    if (!parking) throw new NotFoundException('Parking topilmadi')

    await this.prisma.pricingTier.deleteMany({ where: { parkingId } })

    const tiers = await this.prisma.pricingTier.createMany({
      data: dto.tiers.map((tier) => ({
        parkingId,
        fromMinutes: tier.fromMinutes,
        toMinutes: tier.toMinutes ?? null,
        price: tier.price,
      })),
    })

    return this.getTiers(parkingId)
  }
}
