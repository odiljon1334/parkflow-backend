import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common'
import { PricingService } from './pricing.service'
import { SetPricingDto } from './dto/set-pricing.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Role } from '@prisma/client'

@Controller('parkings/:parkingId/pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  getRules(@Param('parkingId') parkingId: string) {
    return this.pricingService.getRulesByParking(parkingId)
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PARKING_ADMIN)
  setPlan(@Param('parkingId') parkingId: string, @Body() dto: SetPricingDto) {
    return this.pricingService.setPlanForParking(parkingId, dto)
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  getAllPlans() {
    return this.pricingService.getAllPlans()
  }
}
