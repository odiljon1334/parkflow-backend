import { Type } from 'class-transformer'
import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator'

class TierDto {
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
}

export class SetPricingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierDto)
  tiers: TierDto[]
}
