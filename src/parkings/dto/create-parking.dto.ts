import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class CreateParkingDto {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  address?: string

  @IsString()
  regionId: string

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number
}
