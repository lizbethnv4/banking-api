import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Role } from '../database/entities/role.entity.js';
import { User } from '../database/entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role]), AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
