import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { VehiclesService } from './vehicles.service'
import { EntryDto } from './dto/entry.dto'
import { ExitDto } from './dto/exit.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  // Hozir ichkaridagi mashinalar
  @Get('active')
  getActive(@Query('parkingId') parkingId: string) {
    return this.vehiclesService.getActiveSessions(parkingId)
  }

  // Narx preview — chiqishdan oldin ko'rsatish
  @Get('preview-price')
  previewPrice(
    @Query('parkingId') parkingId: string,
    @Query('plate') plate: string,
  ) {
    return this.vehiclesService.previewPrice(parkingId, plate)
  }

  // To'lanmagan sessionlar
  @Get('unpaid')
  getUnpaid(@Query('parkingId') parkingId: string) {
    return this.vehiclesService.getUnpaidSessions(parkingId)
  }

  // Barcha sessionlar (filter bilan)
  @Get()
  findAll(
    @Query('parkingId') parkingId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.vehiclesService.findAll(
      parkingId,
      from ? new Date(from) : undefined,
      to   ? new Date(to)   : undefined,
    )
  }

  // Mashina kirganda
  @Post('entry')
  entry(@Body() dto: EntryDto) {
    return this.vehiclesService.entry(dto)
  }

  // Mashina chiqqanda
  @Post('exit')
  exit(@Body() dto: ExitDto, @CurrentUser() user: any) {
    return this.vehiclesService.exit({ ...dto, operatorId: user?.id })
  }

  // Manual yopish (operator)
  @Patch(':id/close')
  manualClose(
    @Param('id') id: string,
    @Body('note') note: string,
    @CurrentUser() user: any,
  ) {
    return this.vehiclesService.manualClose(id, user?.id, note)
  }
}
