import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator'
import { Role } from '@prisma/client'

export class CreateUserDto {
  @IsString()
  name: string

  @IsString()
  username: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsString()
  @MinLength(4)
  password: string

  @IsEnum(Role)
  role: Role

  @IsOptional()
  @IsString()
  regionId?: string

  @IsOptional()
  @IsString()
  parkingId?: string
}
