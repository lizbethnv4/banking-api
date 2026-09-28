import 'dotenv/config';

import { DataSource } from 'typeorm';

import { Account } from '../src/database/entities/account.entity.js';
import { AccountMovement } from '../src/database/entities/account-movement.entity.js';
import { Transfer } from '../src/database/entities/transfer.entity.js';
import { AccountStatus } from '../src/database/enums.js';

const dataSource = new DataSource({
  type: 'mssql',

  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 1433),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  synchronize: false,

  entities: [
    Account,
    Transfer,
    AccountMovement,
  ],

  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate:
      process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
});

const demoAccounts = [
  {
    accountNumber: '1000000011',
    holderName: 'Cuenta Demo Origen',
    balance: '10000.0000',
  },
  {
    accountNumber: '1000000012',
    holderName: 'Cuenta Demo Destino',
    balance: '5000.0000',
  },
];

async function seed(): Promise<void> {
  await dataSource.initialize();

  console.log('Conexión a la base de datos establecida.');

  try {
    const accountRepository = dataSource.getRepository(Account);

    for (const demo of demoAccounts) {
      let account = await accountRepository.findOne({
        where: {
          accountNumber: demo.accountNumber,
        },
      });

      if (!account) {
        account = accountRepository.create({
          accountNumber: demo.accountNumber,
          holderName: demo.holderName,
          currency: 'DOP',
          balance: demo.balance,
          status: AccountStatus.ACTIVE,
        });
      } else {
        account.holderName = demo.holderName;
        account.currency = 'DOP';
        account.balance = demo.balance;
        account.status = AccountStatus.ACTIVE;
      }

      const savedAccount = await accountRepository.save(account);

      console.log('--------------------------------');
      console.log(`ID: ${savedAccount.id}`);
      console.log(`Cuenta: ${savedAccount.accountNumber}`);
      console.log(`Titular: ${savedAccount.holderName}`);
      console.log(`Balance: RD$${savedAccount.balance}`);
      console.log(`Estado: ${savedAccount.status}`);
    }

    console.log('--------------------------------');
    console.log('Seed demo completado.');
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

seed().catch((error: unknown) => {
  console.error('Error ejecutando seed:', error);
  process.exit(1);
});