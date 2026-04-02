import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { VehiclesService } from './vehicles.service'
import { EntryDto } from './dto/entry.dto'
import { ExitDto } from './dto/exit.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Get('inside')
  getInside(@Query('parkingId') parkingId: string) {
    return this.vehiclesService.getInsideVehicles(parkingId)
  }

  @Get('preview-price')
  previewPrice(
    @Query('parkingId') parkingId: string,
    @Query('plate') plate: string,
  ) {
    return this.vehiclesService.previewPrice(parkingId, plate)
  }

  @Post('entry')
  entry(@Body() dto: EntryDto) {
    return this.vehiclesService.entry(dto)
  }

  @Post('exit')
  exit(@Body() dto: ExitDto) {
    return this.vehiclesService.exit(dto)
  }
}
