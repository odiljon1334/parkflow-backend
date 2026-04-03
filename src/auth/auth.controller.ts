import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { CreateUserDto } from './dto/create-user.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Role } from '@prisma/client'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  // SUPER_ADMIN — har qanday rol yarata oladi
  // REGION_ADMIN — faqat PARKING_ADMIN va OPERATOR yarata oladi
  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN)
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto)
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN)
  getUsers(@CurrentUser() user: any) {
    return this.authService.getUsers(user.role, user.regionId)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id)
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(user.id, body.currentPassword, body.newPassword)
  }
}
