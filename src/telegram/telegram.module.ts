import { Module } from '@nestjs/common'
import { TelegramService } from './telegram.service'
import { ReportsModule } from '../reports/reports.module'

@Module({
  imports: [ReportsModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
