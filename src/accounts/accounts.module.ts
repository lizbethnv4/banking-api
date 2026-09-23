import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../database/entities/account.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Account])],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
