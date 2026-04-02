import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Bot, Context, InputFile } from 'grammy'
import { ReportsService } from '../reports/reports.service'
import { PrismaService } from '../prisma/prisma.service'
import { SessionStatus } from '@prisma/client'

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Bot
  private readonly logger = new Logger(TelegramService.name)

  constructor(
    private readonly config:         ConfigService,
    private readonly reportsService: ReportsService,
    private readonly prisma:         PrismaService,
  ) {}

  async onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN')
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN topilmadi — bot ishlamaydi')
      return
    }

    this.bot = new Bot(token)
    this.registerCommands()
    this.bot.start()
    this.logger.log('✅ Telegram bot ishga tushdi')
  }

  private registerCommands() {
    this.bot.command('start', (ctx) => {
      ctx.reply(
        '🚗 *ParkFlow Botga xush kelibsiz!*\n\n' +
        'Mavjud buyruqlar:\n' +
        '`/today [parkingId]` — Bugungi hisobot\n' +
        '`/week [parkingId]` — Haftalik hisobot\n' +
        '`/month [parkingId]` — Oylik hisobot\n' +
        '`/excel_today [parkingId]` — Excel (kunlik)\n' +
        '`/excel_week [parkingId]` — Excel (haftalik)\n' +
        '`/excel_month [parkingId]` — Excel (oylik)\n' +
        '`/status [parkingId]` — Hozirgi holat',
        { parse_mode: 'Markdown' },
      )
    })

    this.bot.command('today',       (ctx) => this.sendReport(ctx, 'daily'))
    this.bot.command('week',        (ctx) => this.sendReport(ctx, 'weekly'))
    this.bot.command('month',       (ctx) => this.sendReport(ctx, 'monthly'))
    this.bot.command('excel_today', (ctx) => this.sendExcel(ctx, 'daily'))
    this.bot.command('excel_week',  (ctx) => this.sendExcel(ctx, 'weekly'))
    this.bot.command('excel_month', (ctx) => this.sendExcel(ctx, 'monthly'))

    this.bot.command('status', async (ctx) => {
      const parkingId = ctx.message?.text?.split(' ')[1]
      if (!parkingId) {
        ctx.reply('❗ Parking ID kiriting: `/status [parkingId]`', { parse_mode: 'Markdown' })
        return
      }

      const [parking, activeCount, todaySummary] = await Promise.all([
        this.prisma.parking.findUnique({ where: { id: parkingId }, include: { region: true } }),
        this.prisma.vehicleSession.count({ where: { parkingId, status: SessionStatus.ACTIVE } }),
        this.reportsService.getSummary(parkingId, 'daily'),
      ])

      if (!parking) { ctx.reply('Parking topilmadi'); return }

      ctx.reply(
        `🏢 *${parking.name}*\n` +
        `📍 ${parking.region?.name ?? ''}\n\n` +
        `🚗 Hozir ichkarida: *${activeCount} ta*\n` +
        `💰 Bugungi kirim: *${todaySummary.totalIncome.toLocaleString()} so'm*\n` +
        `📊 Bugungi sessiyalar: *${todaySummary.totalSessions} ta*`,
        { parse_mode: 'Markdown' },
      )
    })
  }

  private async sendReport(ctx: Context, period: 'daily' | 'weekly' | 'monthly') {
    const parkingId = ctx.message?.text?.split(' ')[1]
    if (!parkingId) {
      ctx.reply('❗ Parking ID kiriting')
      return
    }

    try {
      const report      = await this.reportsService.getSummary(parkingId, period)
      const periodNames = { daily: 'Kunlik', weekly: 'Haftalik', monthly: 'Oylik' }

      ctx.reply(
        `📊 *${periodNames[period]} hisobot*\n\n` +
        `🚗 Jami sessiyalar: *${report.totalSessions} ta*\n` +
        `💰 Jami kirim: *${report.totalIncome.toLocaleString()} so'm*\n` +
        `📅 ${report.from.toLocaleDateString('uz-UZ')} — ${report.to.toLocaleDateString('uz-UZ')}`,
        { parse_mode: 'Markdown' },
      )
    } catch (e) {
      ctx.reply(`❌ Xatolik: ${e.message}`)
    }
  }

  private async sendExcel(ctx: Context, period: 'daily' | 'weekly' | 'monthly') {
    const parkingId = ctx.message?.text?.split(' ')[1]
    if (!parkingId) {
      ctx.reply('❗ Parking ID kiriting')
      return
    }

    try {
      await ctx.reply('⏳ Excel fayl tayyorlanmoqda...')
      const buffer   = await this.reportsService.generateExcel(parkingId, period)
      const filename = `parkflow-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`

      await ctx.replyWithDocument(
        new InputFile(buffer, filename),
        { caption: `📊 ParkFlow — ${period} hisoboti` },
      )
    } catch (e) {
      ctx.reply(`❌ Xatolik: ${e.message}`)
    }
  }
}
