import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
