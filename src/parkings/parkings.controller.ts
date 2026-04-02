import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { ParkingsService } from './parkings.service'
import { CreateParkingDto } from './dto/create-parking.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Role } from '@prisma/client'

@Controller('parkings')
@UseGuards(JwtAuthGuard)
export class ParkingsController {
  constructor(private parkingsService: ParkingsService) {}

  @Get()
  findAll(@Query('regionId') regionId?: string) {
    return this.parkingsService.findAll(regionId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parkingsService.findOne(id)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN)
  create(@Body() dto: CreateParkingDto) {
    return this.parkingsService.create(dto)
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateParkingDto>) {
    return this.parkingsService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.parkingsService.remove(id)
  }
}
