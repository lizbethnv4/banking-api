import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { DataSource } from 'typeorm';

const API_BASE_URL = 'http://localhost:3001/api';

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
  accountNumber: string;
}

interface LoginResponse {
  accessToken: string;
}

interface TransferResult {
  amount: string;
  status: number;
  body: string;
}

async function login(): Promise<string> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env',
    );
  }

  console.log(`Logging in as ${email}...`);

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

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Login failed. HTTP ${response.status}: ${body}`,
    );
  }

  const result = JSON.parse(body) as LoginResponse;

  if (!result.accessToken) {
    throw new Error('Login response did not contain accessToken');
  }

  console.log('Login successful.\n');

  return result.accessToken;
}

async function createTestAccount(
  accountNumber: string,
  holderName: string,
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
    [id, accountNumber, holderName, balance],
  );

  return {
    id,
    accountNumber,
  };
}

async function transfer(
  accessToken: string,
  sourceAccountId: string,
  destinationAccountId: string,
  amount: string,
): Promise<TransferResult> {
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

  if (!rows.length) {
    throw new Error(`Account ${accountId} not found`);
  }

  return String(rows[0].balance);
}

function normalizeMoney(value: string): string {
  const [integerPart, decimalPart = ''] = value.split('.');

  const normalizedDecimals = decimalPart.replace(/0+$/, '');

  return normalizedDecimals
    ? `${integerPart}.${normalizedDecimals}`
    : integerPart;
}

async function main() {
  await dataSource.initialize();

  try {
    console.log('\n========================================');
    console.log('   CONCURRENCY TEST - REQUIRED CASE');
    console.log('========================================\n');

    // ---------------------------------------------
    // 1. Login and obtain JWT
    // ---------------------------------------------

    const accessToken = await login();

    // ---------------------------------------------
    // 2. Create exactly two test accounts
    // ---------------------------------------------

    const unique = Date.now().toString();

    const source = await createTestAccount(
      `9${unique}`.slice(0, 20),
      'Concurrency Source',
      '10000.0000',
    );

    const destination = await createTestAccount(
      `8${unique}`.slice(0, 20),
      'Concurrency Destination',
      '5000.0000',
    );

    console.log('Initial state:');
    console.log(
      `Source      | ${source.accountNumber} | RD$10,000.0000`,
    );
    console.log(
      `Destination | ${destination.accountNumber} | RD$5,000.0000`,
    );

    // ---------------------------------------------
    // 3. Send both transfers concurrently
    // ---------------------------------------------

    console.log('\nSending simultaneously:');
    console.log('Transfer A → RD$8,000');
    console.log('Transfer B → RD$7,000\n');

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

    // ---------------------------------------------
    // 4. Read final balances
    // ---------------------------------------------

    const sourceBalance = await getBalance(source.id);
    const destinationBalance = await getBalance(
      destination.id,
    );

    const results = [result8000, result7000];

    const successful = results.filter(
      (result) =>
        result.status >= 200 && result.status < 300,
    );

    const rejected = results.filter(
      (result) => result.status >= 400,
    );

    console.log('Results:');
    console.log(`RD$8,000 → HTTP ${result8000.status}`);
    console.log(`RD$7,000 → HTTP ${result7000.status}`);

    console.log('\nFinal balances:');
    console.log(`Source      → RD$${sourceBalance}`);
    console.log(`Destination → RD$${destinationBalance}`);

    // ---------------------------------------------
    // 5. Validate mandatory concurrency scenario
    // ---------------------------------------------

    const normalizedSourceBalance =
      normalizeMoney(sourceBalance);

    const normalizedDestinationBalance =
      normalizeMoney(destinationBalance);

    const sourceBalanceIsValid =
      normalizedSourceBalance === '2000' ||
      normalizedSourceBalance === '3000';

    const destinationBalanceIsValid =
      normalizedDestinationBalance === '13000' ||
      normalizedDestinationBalance === '12000';

    const testPassed =
      successful.length === 1 &&
      rejected.length === 1 &&
      sourceBalanceIsValid &&
      destinationBalanceIsValid;

    console.log('\n========================================');

    if (testPassed) {
      console.log('PASS - CONCURRENCY CONTROL WORKS');
      console.log(
        `Approved transfer: RD$${successful[0].amount}`,
      );
      console.log(
        `Rejected transfer: RD$${rejected[0].amount}`,
      );
      console.log('');
      console.log('Only one transfer was approved.');
      console.log(
        'Balances remained financially consistent.',
      );
      console.log(
        'The source account never became negative.',
      );
    } else {
      console.log('FAIL - UNEXPECTED RESULT');

      console.log({
        result8000,
        result7000,
        sourceBalance,
        destinationBalance,
      });

      process.exitCode = 1;
    }

    console.log('========================================\n');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('\nConcurrency test failed:');
  console.error(error);

  process.exit(1);
});