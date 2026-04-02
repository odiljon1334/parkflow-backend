import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCameraDto } from './dto/create-camera.dto'
import { UpdateCameraDto } from './dto/update-camera.dto'

@Injectable()
export class CamerasService {
  constructor(private prisma: PrismaService) {}

  // Parking ga tegishli barcha kameralar
  async findAll(parkingId: string) {
    return this.prisma.camera.findMany({
      where: { parkingId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findOne(id: string) {
    const camera = await this.prisma.camera.findUnique({
      where: { id },
      include: { parking: { include: { region: true } } },
    })
    if (!camera) throw new NotFoundException('Kamera topilmadi')
    return camera
  }

  // cameraId orqali parking topish (webhook uchun)
  async findParkingByCamera(cameraId: string) {
    const camera = await this.prisma.camera.findUnique({
      where: { id: cameraId },
      include: { parking: true },
    })
    if (!camera) throw new NotFoundException('Kamera topilmadi')
    return camera
  }

  async create(dto: CreateCameraDto) {
    // Parking mavjudligini tekshirish
    const parking = await this.prisma.parking.findUnique({
      where: { id: dto.parkingId },
    })
    if (!parking) throw new NotFoundException('Parking topilmadi')

    // Bir parking da bir xil tipdan faqat bitta kamera bo'lishi kerak (ixtiyoriy cheklov)
    // Agar bir nechta kirish kamerasi kerak bo'lsa bu checkni olib tashlash mumkin
    const existing = await this.prisma.camera.findFirst({
      where: { parkingId: dto.parkingId, type: dto.type },
    })
    if (existing) {
      throw new BadRequestException(
        `Bu parking da allaqachon ${dto.type} kamerasi mavjud: "${existing.name}"`,
      )
    }

    return this.prisma.camera.create({ data: dto })
  }

  async update(id: string, dto: UpdateCameraDto) {
    await this.findOne(id)
    return this.prisma.camera.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.camera.delete({ where: { id } })
  }
}
