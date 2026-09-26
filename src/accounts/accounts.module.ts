import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../database/entities/account.entity.js';
import { AccountMovement } from '../database/entities/account-movement.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account]),
    TypeOrmModule.forFeature([AccountMovement]),
    AuthModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
