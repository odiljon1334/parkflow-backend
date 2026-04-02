import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { EntryMethod } from '@prisma/client'

export class EntryDto {
  @IsString()
  plateNumber: string

  @IsString()
  parkingId: string

  @IsOptional()
  @IsEnum(EntryMethod)
  method?: EntryMethod

  @IsOptional()
  @IsString()
  cameraId?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence?: number

  @IsOptional()
  @IsString()
  entryImageUrl?: string
}
