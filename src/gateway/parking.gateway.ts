import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({ cors: { origin: '*' } })
export class ParkingGateway {
  @WebSocketServer()
  server: Server

  // Parking room ga qo'shilish
  @SubscribeMessage('join:parking')
  handleJoin(@MessageBody() parkingId: string, @ConnectedSocket() client: Socket) {
    client.join(`parking:${parkingId}`)
    return { event: 'joined', data: parkingId }
  }

  // Yangi mashina kirganida broadcast
  emitVehicleEntry(parkingId: string, vehicle: any) {
    this.server.to(`parking:${parkingId}`).emit('vehicle:entry', vehicle)
  }

  // Mashina chiqqanda broadcast
  emitVehicleExit(parkingId: string, vehicle: any) {
    this.server.to(`parking:${parkingId}`).emit('vehicle:exit', vehicle)
  }

  // Ichkaridagi mashina soni yangilanishi
  emitInsideCount(parkingId: string, count: number) {
    this.server.to(`parking:${parkingId}`).emit('inside:count', { parkingId, count })
  }
}
