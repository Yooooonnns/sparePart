import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { GatewayModule } from './gateway/gateway.module';
import { PostsModule } from './posts/posts.module';
import { ComponentsModule } from './components/components.module';
import { RequestsModule } from './requests/requests.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    GatewayModule,
    PostsModule,
    ComponentsModule,
    RequestsModule,
    AdminModule,
  ],
})
export class AppModule {}
