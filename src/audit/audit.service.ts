import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getSessionEvents(parkingId?: string, limit = 100) {
    return this.prisma.sessionEvent.findMany({
      where: parkingId
        ? { session: { parkingId } }
        : undefined,
      include: {
        session: {
          select: {
            plateNumber: true,
            country: true,
            parkingId: true,
            parking: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}
