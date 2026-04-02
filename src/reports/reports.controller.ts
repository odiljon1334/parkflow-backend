import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { ReportsService, ReportPeriod } from './reports.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('parking/:parkingId')
  getSummary(
    @Param('parkingId') parkingId: string,
    @Query('period') period: ReportPeriod = 'daily',
  ) {
    return this.reportsService.getSummary(parkingId, period)
  }

  @Get('region/:regionId')
  getSummaryByRegion(
    @Param('regionId') regionId: string,
    @Query('period') period: ReportPeriod = 'daily',
  ) {
    return this.reportsService.getSummaryByRegion(regionId, period)
  }

  @Get('parking/:parkingId/excel')
  async downloadExcel(
    @Param('parkingId') parkingId: string,
    @Query('period') period: ReportPeriod = 'daily',
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateExcel(parkingId, period)
    const filename = `parkflow-${period}-${Date.now()}.xlsx`

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    })

    res.send(buffer)
  }
}
