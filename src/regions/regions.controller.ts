import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { RegionsService } from './regions.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Role } from '@prisma/client'

@Controller('regions')
@UseGuards(JwtAuthGuard)
export class RegionsController {
  constructor(private regionsService: RegionsService) {}

  @Get()
  findAll() {
    return this.regionsService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.regionsService.findOne(id)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body('name') name: string) {
    return this.regionsService.create(name)
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body('name') name: string) {
    return this.regionsService.update(id, name)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.regionsService.remove(id)
  }
}
