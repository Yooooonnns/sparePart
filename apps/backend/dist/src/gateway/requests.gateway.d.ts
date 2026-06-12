import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class RequestsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinManagement(client: Socket): void;
    emitRequestNew(request: Record<string, unknown>): void;
    emitRequestUpdated(request: Record<string, unknown>): void;
}
