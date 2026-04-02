import { Body, Controller, Post, Logger } from '@nestjs/common'
import { VehiclesService } from '../vehicles/vehicles.service'
import { CamerasService } from '../cameras/cameras.service'
import { EntryMethod } from '@prisma/client'

// Hikvision ANPR kamerasi yuboradigan event strukturasi
interface HikvisionEvent {
  plateNumber: string   // Kamera o'qigan plaka
  cameraId: string      // Bizning DB dagi camera.id
  eventType: 'ENTRY' | 'EXIT'
  confidence?: number   // Tanish ishonchliligi (%)
}

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)

  constructor(
    private vehiclesService: VehiclesService,
    private camerasService: CamerasService,
  ) {}

  @Post('hikvision')
  async handleHikvision(@Body() event: HikvisionEvent) {
    this.logger.log(
      `Hikvision → ${event.eventType} | plate: ${event.plateNumber} | cam: ${event.cameraId}`,
    )

    try {
      // cameraId orqali parking ni aniqlaymiz
      const camera = await this.camerasService.findParkingByCamera(event.cameraId)
      const parkingId = camera.parking.id

      // Camera tipi va event tipi mos kelishini tekshiramiz
      if (event.eventType === 'ENTRY' && camera.type !== 'ENTRY') {
        this.logger.warn(`Camera ${event.cameraId} EXIT kamerasi, lekin ENTRY event keldi`)
      }

      if (event.eventType === 'ENTRY') {
        return await this.vehiclesService.entry({
          plateNumber: event.plateNumber,
          parkingId,
          method: EntryMethod.AUTO,
        })
      }

      if (event.eventType === 'EXIT') {
        return await this.vehiclesService.exit({
          plateNumber: event.plateNumber,
          parkingId,
          method: EntryMethod.AUTO,
        })
      }
    } catch (error) {
      this.logger.error(`Webhook xatolik: ${error.message}`)
      // Kameraga xatolikni qaytarmaymiz, faqat log qilamiz
      return { success: false, error: error.message }
    }
  }
}
