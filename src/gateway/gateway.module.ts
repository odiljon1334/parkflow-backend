import { Module } from '@nestjs/common'
import { ParkingGateway } from './parking.gateway'

@Module({
  providers: [ParkingGateway],
  exports: [ParkingGateway],
})
export class GatewayModule {}
