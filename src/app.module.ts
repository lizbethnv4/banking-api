import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './config/database.config.js';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { AccountsModule } from './accounts/accounts.module.js';
import { TransfersModule } from './transfers/transfers.module.js';
import { BatchTransfersModule } from './batch-transfers/batch-transfers.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildTypeOrmOptions(config),
    }),
    HealthModule,
    AccountsModule,
    TransfersModule,
    BatchTransfersModule,
  ],
})
export class AppModule {}
