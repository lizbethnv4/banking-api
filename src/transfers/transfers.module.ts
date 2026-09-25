import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller.js';
import { TransfersService } from './transfers.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transfer } from '../database/entities/transfer.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Transfer])],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
