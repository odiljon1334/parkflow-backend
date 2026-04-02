import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { CreateUserDto } from './dto/create-user.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: { region: true, parking: true },
    })

    if (!user) throw new UnauthorizedException('Username yoki parol noto\'g\'ri')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Username yoki parol noto\'g\'ri')

    const token = this.jwt.sign({
      sub: user.id,
      role: user.role,
      regionId: user.regionId,
      parkingId: user.parkingId,
    })

    const { passwordHash, ...userWithoutPassword } = user
    return { token, user: userWithoutPassword }
  }

  async createUser(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { username: dto.username },
    })
    if (exists) throw new ConflictException('Bu username allaqachon mavjud')

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        username: dto.username,
        passwordHash,
        role: dto.role,
        regionId: dto.regionId,
        parkingId: dto.parkingId,
      },
    })

    const { passwordHash: _, ...result } = user
    return result
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { region: true, parking: true },
    })
    if (!user) throw new UnauthorizedException()
    const { passwordHash, ...result } = user
    return result
  }
}
