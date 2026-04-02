import { IsEnum, IsOptional, IsString } from 'class-validator'
import { EntryMethod, PaymentMethod } from '@prisma/client'

export class ExitDto {
  @IsString()
  plateNumber: string

  @IsString()
  parkingId: string

  @IsOptional()
  @IsEnum(EntryMethod)
  method?: EntryMethod

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod

  @IsOptional()
  @IsString()
  cameraId?: string

  @IsOptional()
  @IsString()
  exitImageUrl?: string

  @IsOptional()
  @IsString()
  operatorId?: string
}
