import { Module } from '@nestjs/common'
import { WebhookController } from './webhook.controller'
import { VehiclesModule } from '../vehicles/vehicles.module'
import { CamerasModule } from '../cameras/cameras.module'

@Module({
  imports: [VehiclesModule, CamerasModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
