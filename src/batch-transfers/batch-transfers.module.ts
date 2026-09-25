import { Module } from '@nestjs/common';
import { BatchTransfersController } from './batch-transfers.controller.js';
import { BatchTransfersService } from './batch-transfers.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchProcess } from '../database/entities/batch-process.entity.js';
import { BatchTransferItem } from '../database/entities/batch-transfer-item.entity.js';
import { TransfersModule } from '../transfers/transfers.module.js';
import { AccountsModule } from '../accounts/accounts.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BatchProcess, 
      BatchTransferItem
    ]),
    TransfersModule,
    AccountsModule,
  ],
  controllers: [BatchTransfersController],
  providers: [BatchTransfersService],
  exports: [BatchTransfersService],
})
export class BatchTransfersModule {}
