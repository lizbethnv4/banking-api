import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  Account,
  AccountMovement,
  BatchProcess,
  BatchTransferItem,
  Role,
  Transfer,
  User,
} from '../database/entities/index.js';

const databaseDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'database');

export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'mssql',
    host: config.getOrThrow<string>('DB_HOST'),
    port: parseInt(config.get<string>('DB_PORT', '1433'), 10),
    username: config.get<string>('DB_USER', 'sa'),
    password: config.get<string>('DB_PASSWORD', ''),
    database: config.getOrThrow<string>('DB_NAME'),
    synchronize: false,
    autoLoadEntities: false,
    entities: [
      Account,
      Transfer,
      AccountMovement,
      BatchProcess,
      BatchTransferItem,
      Role,
      User,
    ],
    migrations: [join(databaseDir, 'migrations', '*.{ts,js}')],
    logging: config.get<string>('NODE_ENV') !== 'production',
    options: {
      encrypt: config.get<string>('DB_ENCRYPT') === 'true',
      trustServerCertificate:
        config.get<string>('DB_TRUST_SERVER_CERTIFICATE') === 'true',
    },
  };
}
