import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  controllers: [RequestsController],
})
export class RequestsModule {}
