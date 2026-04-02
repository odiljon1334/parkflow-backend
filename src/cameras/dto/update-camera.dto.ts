import { CameraType } from '@prisma/client'
import { IsEnum, IsIP, IsOptional, IsString } from 'class-validator'

export class UpdateCameraDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsEnum(CameraType)
  type?: CameraType

  @IsOptional()
  @IsIP()
  ipAddress?: string
}
