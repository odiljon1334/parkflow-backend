import { Type } from 'class-transformer'
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator'

export class TierDto {
  @IsInt()
  @Min(0)
  fromMinutes: number

  @IsOptional()
  @IsInt()
  @Min(1)
  toMinutes?: number

  @IsInt()
  @Min(0)
  price: number

  @IsOptional()
  @IsString()
  label?: string   // "0-3 soat", "3-6 soat" — UI uchun
}

export class SetPricingDto {
  @IsOptional()
  @IsString()
  name?: string    // TariffPlan nomi

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierDto)
  tiers: TierDto[]
}
