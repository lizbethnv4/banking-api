import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3001/api';
const RUNS = 5;

const dataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 1433),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate:
      process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
});

interface TestAccount {
  id: string;
  account_number: string;
}

interface LoginResponse {
  accessToken: string;
}

async function login(): Promise<string> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL y ADMIN_PASSWORD deben estar configurados en .env',
    );
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `No se pudo autenticar (${response.status}): ${body}`,
    );
  }

  const body = (await response.json()) as LoginResponse;

  if (!body.accessToken) {
    throw new Error('El login no devolvió accessToken.');
  }

  return body.accessToken;
}

async function createTestAccount(
  accountNumber: string,
  balance: string,
): Promise<TestAccount> {
  const id = randomUUID();

  await dataSource.query(
    `
      INSERT INTO accounts
        (
          id,
          account_number,
          holder_name,
          currency,
          balance,
          status,
          created_at,
          updated_at
        )
      VALUES
        (@0, @1, @2, 'DOP', @3, 'ACTIVE', GETDATE(), GETDATE())
    `,
    [
      id,
      accountNumber,
      `Concurrency Test ${accountNumber}`,
      balance,
    ],
  );

  return {
    id,
    account_number: accountNumber,
  };
}

async function transfer(
  accessToken: string,
  sourceAccountId: string,
  destinationAccountId: string,
  amount: string,
) {
  const response = await fetch(`${API_BASE_URL}/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      sourceAccountId,
      destinationAccountId,
      amount,
      idempotencyKey: randomUUID(),
    }),
  });

  const body = await response.text();

  return {
    amount,
    status: response.status,
    body,
  };
}

async function getBalance(accountId: string): Promise<string> {
  const rows: Array<{ balance: string | number }> =
    await dataSource.query(
      `
        SELECT balance
        FROM accounts
        WHERE id = @0
      `,
      [accountId],
    );

  return String(rows[0].balance);
}

async function main() {
  console.log('Autenticando usuario ADMIN...');

  const accessToken = await login();

  console.log('Autenticación correcta.');

  await dataSource.initialize();

  let passed = 0;

  try {
    for (let run = 1; run <= RUNS; run++) {
      console.log(`\n========== RUN ${run} ==========`);

      const unique = `${Date.now()}${run}`;

      const source = await createTestAccount(
        `9${unique}`.slice(0, 20),
        '10000.0000',
      );

      const destination = await createTestAccount(
        `8${unique}`.slice(0, 20),
        '5000.0000',
      );

      // Las dos solicitudes se lanzan concurrentemente.
      const [result8000, result7000] = await Promise.all([
        transfer(
          accessToken,
          source.id,
          destination.id,
          '8000.0000',
        ),
        transfer(
          accessToken,
          source.id,
          destination.id,
          '7000.0000',
        ),
      ]);

      const sourceBalance = await getBalance(source.id);
      const destinationBalance = await getBalance(destination.id);

      const successful = [result8000, result7000].filter(
        (result) => result.status >= 200 && result.status < 300,
      );

      const rejected = [result8000, result7000].filter(
        (result) => result.status >= 400,
      );

      const balanceIsValid =
        sourceBalance === '2000.0000' ||
        sourceBalance === '3000.0000' ||
        sourceBalance === '2000' ||
        sourceBalance === '3000';

      const destinationBalanceIsValid =
        destinationBalance === '13000.0000' ||
        destinationBalance === '12000.0000' ||
        destinationBalance === '13000' ||
        destinationBalance === '12000';

      const testPassed =
        successful.length === 1 &&
        rejected.length === 1 &&
        balanceIsValid &&
        destinationBalanceIsValid;

      if (testPassed) {
        passed++;

        console.log(
          `PASS | winner=${successful[0].amount} | sourceBalance=${sourceBalance} | destinationBalance=${destinationBalance}`,
        );
      } else {
        console.log('FAIL');

        console.log({
          result8000,
          result7000,
          sourceBalance,
          destinationBalance,
        });
      }
    }

    console.log('\n==============================');
    console.log(`Concurrency test: ${passed}/${RUNS} PASS`);
    console.log('==============================');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});