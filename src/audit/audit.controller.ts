import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AuditService } from './audit.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Role } from '@prisma/client'

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  getEvents(
    @Query('parkingId') parkingId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getSessionEvents(parkingId, limit ? +limit : 100)
  }
}
