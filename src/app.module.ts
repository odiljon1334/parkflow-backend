import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { RegionsModule } from './regions/regions.module'
import { ParkingsModule } from './parkings/parkings.module'
import { PricingModule } from './pricing/pricing.module'
import { VehiclesModule } from './vehicles/vehicles.module'
import { CamerasModule } from './cameras/cameras.module'
import { WebhookModule } from './webhook/webhook.module'
import { ReportsModule } from './reports/reports.module'
import { GatewayModule } from './gateway/gateway.module'
import { TelegramModule } from './telegram/telegram.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    RegionsModule,
    ParkingsModule,
    PricingModule,
    VehiclesModule,
    CamerasModule,
    WebhookModule,
    ReportsModule,
    GatewayModule,
    TelegramModule,
  ],
})
export class AppModule {}
