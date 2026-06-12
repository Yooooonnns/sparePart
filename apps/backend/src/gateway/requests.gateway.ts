import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class RequestsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RequestsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-management')
  handleJoinManagement(@ConnectedSocket() client: Socket) {
    client.join('management');
  }

  emitRequestNew(request: Record<string, unknown>) {
    this.server.to('management').emit('request:new', request);
  }

  emitRequestUpdated(request: Record<string, unknown>) {
    this.server.to('management').emit('request:updated', request);
  }
}
