import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class RegionsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.region.findMany({
      include: { _count: { select: { parkings: true } } },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findOne(id: string) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      include: { parkings: true },
    })
    if (!region) throw new NotFoundException('Region topilmadi')
    return region
  }

  create(name: string) {
    return this.prisma.region.create({ data: { name } })
  }

  async update(id: string, name: string) {
    await this.findOne(id)
    return this.prisma.region.update({ where: { id }, data: { name } })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.region.delete({ where: { id } })
  }
}
