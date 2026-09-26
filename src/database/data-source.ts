import 'dotenv/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import {
  Account,
  AccountMovement,
  BatchProcess,
  BatchTransferItem,
  Transfer,
  Role,
  User,
} from './entities/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  username: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'banking',
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  entities: [
    Account,
    Transfer,
    AccountMovement,
    BatchProcess,
    BatchTransferItem,
    Role,
    User,
  ],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
});

export default AppDataSource;
