import { Module } from '@nestjs/common'
import { WebhookController } from './webhook.controller'
import { VehiclesModule } from '../vehicles/vehicles.module'

@Module({
  imports: [VehiclesModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
