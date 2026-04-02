import { Body, Controller, Post, Logger, Headers, HttpCode } from '@nestjs/common'
import { VehiclesService } from '../vehicles/vehicles.service'
import { CamerasService } from '../cameras/cameras.service'
import { EntryMethod } from '@prisma/client'

/**
 * Hikvision ANPR kamerasi yuboradigan event strukturasi
 * Kamera HTTP callback orqali POST yuboradi
 */
interface HikvisionAnprEvent {
  plateNumber:  string           // O'qilgan plaka raqami
  cameraId:     string           // Bizning DB dagi camera.id
  eventType:    'ENTRY' | 'EXIT'
  confidence?:  number           // Tanish ishonchliligi (0–100)
  captureTime?: string           // ISO format vaqt
  imageUrl?:    string           // Snapshot URL
}

// Dedup: bir xil plaka + camera uchun 20 soniya ichida qayta event kelsa ignore qilinadi
const dedupCache = new Map<string, number>()
const DEDUP_WINDOW_MS = 20_000

function isDuplicate(plateNumber: string, cameraId: string): boolean {
  const key = `${plateNumber}:${cameraId}`
  const lastTime = dedupCache.get(key)
  const now = Date.now()

  if (lastTime && now - lastTime < DEDUP_WINDOW_MS) return true

  dedupCache.set(key, now)

  // Cache tozalash — xotira uchun
  if (dedupCache.size > 500) {
    for (const [k, t] of dedupCache.entries()) {
      if (now - t > DEDUP_WINDOW_MS) dedupCache.delete(k)
    }
  }

  return false
}

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)

  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly camerasService:  CamerasService,
  ) {}

  /**
   * POST /webhook/hikvision
   * Hikvision kamera shu endpoint ga ANPR event yuboradi
   */
  @Post('hikvision')
  @HttpCode(200)
  async handleHikvision(
    @Body() event: HikvisionAnprEvent,
    @Headers('x-webhook-key') webhookKey?: string,
  ) {
    this.logger.log(
      `Hikvision event → ${event.eventType} | plate: ${event.plateNumber} | cam: ${event.cameraId} | confidence: ${event.confidence ?? 'N/A'}%`,
    )

    // 1) Duplicate tekshirish
    if (isDuplicate(event.plateNumber, event.cameraId)) {
      this.logger.warn(`Duplicate event ignored: ${event.plateNumber} @ ${event.cameraId}`)
      return { success: true, skipped: true, reason: 'duplicate' }
    }

    try {
      // 2) Camera → Parking aniqlash
      const camera = await this.camerasService.findParkingByCamera(event.cameraId)
      const parkingId = camera.parking.id

      // 3) Camera statusini yangilash (online)
      await this.camerasService.markOnline(event.cameraId)

      // 4) Camera type va event type mos kelishini tekshirish
      if (event.eventType === 'ENTRY' && camera.type !== 'ENTRY') {
        this.logger.warn(
          `Tip nomuvofiq: ${event.cameraId} EXIT kamerasi lekin ENTRY event keldi`,
        )
      }

      // 5) Session ochish yoki yopish
      if (event.eventType === 'ENTRY') {
        const session = await this.vehiclesService.entry({
          plateNumber:   event.plateNumber,
          parkingId,
          method:        EntryMethod.AUTO,
          cameraId:      event.cameraId,
          confidence:    event.confidence,
          entryImageUrl: event.imageUrl,
        })
        return { success: true, sessionId: session.id }
      }

      if (event.eventType === 'EXIT') {
        const session = await this.vehiclesService.exit({
          plateNumber:  event.plateNumber,
          parkingId,
          method:       EntryMethod.AUTO,
          cameraId:     event.cameraId,
          exitImageUrl: event.imageUrl,
        })
        return { success: true, sessionId: session.id, amount: session.totalAmount }
      }

      return { success: false, reason: 'unknown_event_type' }
    } catch (error) {
      this.logger.error(`Webhook xatolik: ${error.message}`, error.stack)
      // Kameraga har doim 200 qaytaramiz — kamera retry qilmasligi uchun
      return { success: false, error: error.message }
    }
  }
}
