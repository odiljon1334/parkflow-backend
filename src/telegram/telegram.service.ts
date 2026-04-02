import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Bot, Context, InputFile } from 'grammy'
import { ReportsService } from '../reports/reports.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Bot
  private readonly logger = new Logger(TelegramService.name)

  constructor(
    private config: ConfigService,
    private reportsService: ReportsService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN')
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN topilmadi, bot ishlamaydi')
      return
    }

    this.bot = new Bot(token)
    this.registerCommands()
    this.bot.start()
    this.logger.log('Telegram bot ishga tushdi')
  }

  private registerCommands() {
    this.bot.command('start', (ctx) => {
      ctx.reply(
        '🚗 ParkFlow Botga xush kelibsiz!\n\n' +
        'Mavjud buyruqlar:\n' +
        '/report\\_daily \\[parkingId\\] — Kunlik hisobot\n' +
        '/report\\_weekly \\[parkingId\\] — Haftalik hisobot\n' +
        '/report\\_monthly \\[parkingId\\] — Oylik hisobot\n' +
        '/excel\\_daily \\[parkingId\\] — Excel yuklab olish\n' +
        '/status \\[parkingId\\] — Hozirgi holat',
        { parse_mode: 'MarkdownV2' },
      )
    })

    this.bot.command('report_daily', async (ctx) => {
      await this.sendReport(ctx, 'daily')
    })

    this.bot.command('report_weekly', async (ctx) => {
      await this.sendReport(ctx, 'weekly')
    })

    this.bot.command('report_monthly', async (ctx) => {
      await this.sendReport(ctx, 'monthly')
    })

    this.bot.command('excel_daily', async (ctx) => {
      await this.sendExcel(ctx, 'daily')
    })

    this.bot.command('excel_weekly', async (ctx) => {
      await this.sendExcel(ctx, 'weekly')
    })

    this.bot.command('excel_monthly', async (ctx) => {
      await this.sendExcel(ctx, 'monthly')
    })

    this.bot.command('status', async (ctx) => {
      const args = ctx.message?.text?.split(' ')
      const parkingId = args?.[1]
      if (!parkingId) {
        ctx.reply('Parking ID kiriting: /status [parkingId]')
        return
      }

      const count = await this.prisma.vehicle.count({
        where: { parkingId, status: 'INSIDE' },
      })

      const parking = await this.prisma.parking.findUnique({ where: { id: parkingId } })
      ctx.reply(`🏢 ${parking?.name ?? parkingId}\n🚗 Hozir ichkarida: ${count} ta mashina`)
    })
  }

  private async sendReport(ctx: Context, period: 'daily' | 'weekly' | 'monthly') {
    const args = ctx.message?.text?.split(' ')
    const parkingId = args?.[1]
    if (!parkingId) {
      ctx.reply('Parking ID kiriting: /report_daily [parkingId]')
      return
    }

    try {
      const report = await this.reportsService.getSummary(parkingId, period)
      const periodNames = { daily: 'Kunlik', weekly: 'Haftalik', monthly: 'Oylik' }

      ctx.reply(
        `📊 *${periodNames[period]} hisobot*\n\n` +
        `🚗 Jami mashinalar: ${report.totalVehicles} ta\n` +
        `💰 Jami kirim: ${report.totalIncome.toLocaleString()} so'm\n` +
        `📅 Sana: ${report.from.toLocaleDateString()} — ${report.to.toLocaleDateString()}`,
        { parse_mode: 'Markdown' },
      )
    } catch (e) {
      ctx.reply(`Xatolik: ${e.message}`)
    }
  }

  private async sendExcel(ctx: Context, period: 'daily' | 'weekly' | 'monthly') {
    const args = ctx.message?.text?.split(' ')
    const parkingId = args?.[1]
    if (!parkingId) {
      ctx.reply('Parking ID kiriting: /excel_daily [parkingId]')
      return
    }

    try {
      await ctx.reply('Excel fayl tayyorlanmoqda...')
      const buffer = await this.reportsService.generateExcel(parkingId, period)
      const filename = `parkflow-${period}-${Date.now()}.xlsx`

      await ctx.replyWithDocument(
        new InputFile(buffer, filename),
        { caption: `📊 ParkFlow — ${period} hisoboti` },
      )
    } catch (e) {
      ctx.reply(`Xatolik: ${e.message}`)
    }
  }
}
