import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCameraDto } from './dto/create-camera.dto'
import { UpdateCameraDto } from './dto/update-camera.dto'
import { CameraStatus } from '@prisma/client'

@Injectable()
export class CamerasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(parkingId: string) {
    return this.prisma.camera.findMany({
      where:   { parkingId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findOne(id: string) {
    const camera = await this.prisma.camera.findUnique({
      where:   { id },
      include: { parking: { include: { region: true } } },
    })
    if (!camera) throw new NotFoundException('Kamera topilmadi')
    return camera
  }

  // Webhook uchun — cameraId orqali parking topish
  async findParkingByCamera(cameraId: string) {
    const camera = await this.prisma.camera.findUnique({
      where:   { id: cameraId },
      include: { parking: true },
    })
    if (!camera) throw new NotFoundException(`Kamera topilmadi: ${cameraId}`)
    return camera
  }

  async create(dto: CreateCameraDto) {
    const parking = await this.prisma.parking.findUnique({ where: { id: dto.parkingId } })
    if (!parking) throw new NotFoundException('Parking topilmadi')

    return this.prisma.camera.create({ data: dto })
  }

  async update(id: string, dto: UpdateCameraDto) {
    await this.findOne(id)
    return this.prisma.camera.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    // Soft delete
    return this.prisma.camera.update({ where: { id }, data: { isActive: false } })
  }

  // Webhook kelganda kamerani ONLINE deb belgilash
  async markOnline(cameraId: string) {
    return this.prisma.camera.update({
      where: { id: cameraId },
      data:  { status: CameraStatus.ONLINE, lastSeenAt: new Date() },
    })
  }

  // Health check — 5 daqiqa ichida ping bo'lmagan kameralar OFFLINE
  async checkOfflineCameras() {
    const threshold = new Date(Date.now() - 5 * 60 * 1000)
    return this.prisma.camera.updateMany({
      where: {
        status:    CameraStatus.ONLINE,
        lastSeenAt: { lt: threshold },
      },
      data: { status: CameraStatus.OFFLINE },
    })
  }

  async getCameraStatuses(parkingId: string) {
    return this.prisma.camera.findMany({
      where:  { parkingId, isActive: true },
      select: { id: true, name: true, type: true, status: true, lastSeenAt: true },
    })
  }
}
