import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller.js';
import { TransfersService } from './transfers.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
