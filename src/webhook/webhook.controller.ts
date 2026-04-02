import { Body, Controller, Post, Logger } from '@nestjs/common'
import { VehiclesService } from '../vehicles/vehicles.service'
import { EntryMethod } from '@prisma/client'

// Hikvision ANPR kamerasi yuboradigan event strukturasi
interface HikvisionEvent {
  plateNumber: string
  cameraId: string
  parkingId: string
  eventType: 'ENTRY' | 'EXIT'
  confidence?: number
}

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)

  constructor(private vehiclesService: VehiclesService) {}

  @Post('hikvision')
  async handleHikvision(@Body() event: HikvisionEvent) {
    this.logger.log(`Hikvision event: ${event.eventType} - ${event.plateNumber}`)

    try {
      if (event.eventType === 'ENTRY') {
        return await this.vehiclesService.entry({
          plateNumber: event.plateNumber,
          parkingId: event.parkingId,
          method: EntryMethod.AUTO,
        })
      }

      if (event.eventType === 'EXIT') {
        return await this.vehiclesService.exit({
          plateNumber: event.plateNumber,
          parkingId: event.parkingId,
          method: EntryMethod.AUTO,
        })
      }
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`)
      return { error: error.message }
    }
  }
}
