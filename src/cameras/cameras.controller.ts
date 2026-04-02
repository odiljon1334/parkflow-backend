import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { CamerasService } from './cameras.service'
import { CreateCameraDto } from './dto/create-camera.dto'
import { UpdateCameraDto } from './dto/update-camera.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Role } from '@prisma/client'

@Controller('cameras')
@UseGuards(JwtAuthGuard)
export class CamerasController {
  constructor(private camerasService: CamerasService) {}

  // Parking ga tegishli kameralar: GET /cameras?parkingId=xxx
  @Get()
  findAll(@Query('parkingId') parkingId: string) {
    return this.camerasService.findAll(parkingId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.camerasService.findOne(id)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN)
  create(@Body() dto: CreateCameraDto) {
    return this.camerasService.create(dto)
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCameraDto) {
    return this.camerasService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.camerasService.remove(id)
  }
}
