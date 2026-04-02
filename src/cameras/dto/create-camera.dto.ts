import { CameraType } from '@prisma/client'
import { IsEnum, IsIP, IsOptional, IsString } from 'class-validator'

export class CreateCameraDto {
  @IsString()
  name: string

  @IsEnum(CameraType)
  type: CameraType

  @IsOptional()
  @IsIP()
  ipAddress?: string

  @IsString()
  parkingId: string
}
