import { IsEnum, IsOptional, IsString } from 'class-validator'
import { EntryMethod } from '@prisma/client'

export class EntryDto {
  @IsString()
  plateNumber: string

  @IsString()
  parkingId: string

  @IsOptional()
  @IsEnum(EntryMethod)
  method?: EntryMethod
}
