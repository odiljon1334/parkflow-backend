import { IsOptional, IsString } from 'class-validator'

export class CreateParkingDto {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  address?: string

  @IsString()
  regionId: string
}
