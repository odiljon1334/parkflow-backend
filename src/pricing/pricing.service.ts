import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SetPricingDto } from './dto/set-pricing.dto'

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  // Parking ga biriktirilgan tarif qoidalarini olish
  async getRulesByParking(parkingId: string) {
    const parking = await this.prisma.parking.findUnique({
      where:   { id: parkingId },
      include: { tariffPlan: { include: { rules: { orderBy: { fromMinutes: 'asc' } } } } },
    })
    if (!parking) throw new NotFoundException('Parking topilmadi')
    return parking.tariffPlan?.rules ?? []
  }

  // Parking uchun yangi TariffPlan yaratish yoki yangilash
  async setPlanForParking(parkingId: string, dto: SetPricingDto) {
    const parking = await this.prisma.parking.findUnique({ where: { id: parkingId } })
    if (!parking) throw new NotFoundException('Parking topilmadi')

    // Eski planni o'chirish
    if (parking.tariffPlanId) {
      await this.prisma.tariffRule.deleteMany({ where: { tariffPlanId: parking.tariffPlanId } })
      await this.prisma.tariffPlan.delete({ where: { id: parking.tariffPlanId } })
    }

    // Yangi plan + rullar
    const plan = await this.prisma.tariffPlan.create({
      data: {
        name:  dto.name ?? `${parkingId} tarifi`,
        rules: {
          create: dto.tiers.map((tier, i) => ({
            fromMinutes: tier.fromMinutes,
            toMinutes:   tier.toMinutes ?? null,
            price:       tier.price,
            label:       tier.label ?? null,
            sortOrder:   i,
          })),
        },
      },
      include: { rules: { orderBy: { fromMinutes: 'asc' } } },
    })

    await this.prisma.parking.update({
      where: { id: parkingId },
      data:  { tariffPlanId: plan.id },
    })

    return plan
  }

  // Barcha tarif planlari (SuperAdmin)
  async getAllPlans() {
    return this.prisma.tariffPlan.findMany({
      include: { rules: { orderBy: { fromMinutes: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
  }
}
