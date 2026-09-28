import 'dotenv/config';

import AppDataSource from '../src/database/data-source.js';

const DEFAULT_MOVEMENT_COUNT = 200_000;
const MOVEMENTS_PER_BATCH = 5_000;
const LOAD_ACCOUNT_COUNT = 50;

async function main() {
  const requestedCount = Number(
    process.argv[2] ?? DEFAULT_MOVEMENT_COUNT,
  );

  if (
    !Number.isInteger(requestedCount) ||
    requestedCount <= 0 ||
    requestedCount % 2 !== 0
  ) {
    throw new Error(
      'La cantidad de movimientos debe ser un entero positivo y par.',
    );
  }

  await AppDataSource.initialize();

  try {
    console.log('Creando cuentas de carga...');
    await createLoadAccounts();

    console.log(
      `Generando ${requestedCount.toLocaleString()} movimientos...`,
    );

    const startedAt = Date.now();

    let generatedMovements = 0;

    while (generatedMovements < requestedCount) {
      const movementsInBatch = Math.min(
        MOVEMENTS_PER_BATCH,
        requestedCount - generatedMovements,
      );

      const transfersInBatch = movementsInBatch / 2;

      await generateBatch(
        transfersInBatch,
        generatedMovements / 2,
      );

      generatedMovements += movementsInBatch;

      console.log(
        `${generatedMovements.toLocaleString()} / ` +
          `${requestedCount.toLocaleString()} movimientos`,
      );
    }

    const result: Array<{ total: number }> =
      await AppDataSource.query(`
        SELECT COUNT(*) AS total
        FROM account_movements;
      `);

    const elapsedSeconds = (Date.now() - startedAt) / 1000;

    console.log('');
    console.log('Seed de volumen completado.');
    console.log(
      `Movimientos generados en esta ejecución: ${requestedCount}`,
    );
    console.log(
      `Movimientos totales en BD: ${result[0].total}`,
    );
    console.log(
      `Duración: ${elapsedSeconds.toFixed(2)} segundos`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

async function createLoadAccounts(): Promise<void> {
  for (let i = 1; i <= LOAD_ACCOUNT_COUNT; i++) {
    const accountNumber = `LOAD${i.toString().padStart(6, '0')}`;

    await AppDataSource.query(
      `
        IF NOT EXISTS (
          SELECT 1
          FROM accounts
          WHERE account_number = @0
        )
        BEGIN
          INSERT INTO accounts (
            id,
            account_number,
            holder_name,
            currency,
            balance,
            status,
            created_at,
            updated_at
          )
          VALUES (
            NEWID(),
            @0,
            @1,
            'DOP',
            1000000.0000,
            'ACTIVE',
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
          );
        END;
      `,
      [
        accountNumber,
        `Load Test Account ${i}`,
      ],
    );
  }
}

async function generateBatch(
  transferCount: number,
  offset: number,
): Promise<void> {
  await AppDataSource.query(
    `
      SET NOCOUNT ON;

      BEGIN TRANSACTION;

      BEGIN TRY

        DECLARE @SeedTransfers TABLE (
          id uniqueidentifier NOT NULL,
          source_account_id uniqueidentifier NOT NULL,
          destination_account_id uniqueidentifier NOT NULL,
          amount decimal(19,4) NOT NULL,
          row_number int NOT NULL
        );

        ;WITH Numbers AS (
          SELECT TOP (@0)
            ROW_NUMBER() OVER (
              ORDER BY (SELECT NULL)
            ) AS n
          FROM sys.all_objects a
          CROSS JOIN sys.all_objects b
        ),
        LoadAccounts AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              ORDER BY account_number
            ) AS rn
          FROM accounts
          WHERE account_number LIKE 'LOAD%'
        )
        INSERT INTO @SeedTransfers (
          id,
          source_account_id,
          destination_account_id,
          amount,
          row_number
        )
        SELECT
          NEWID(),
          sourceAccount.id,
          destinationAccount.id,
          CAST(
            ((numbers.n + @1) % 100) + 1
            AS decimal(19,4)
          ),
          numbers.n + @1
        FROM Numbers numbers
        INNER JOIN LoadAccounts sourceAccount
          ON sourceAccount.rn =
            (((numbers.n + @1 - 1) % @2) + 1)
        INNER JOIN LoadAccounts destinationAccount
          ON destinationAccount.rn =
            (((numbers.n + @1) % @2) + 1);

        INSERT INTO transfers (
          id,
          reference,
          source_account_id,
          destination_account_id,
          amount,
          status,
          idempotency_key,
          failure_code,
          failure_message,
          created_at,
          completed_at
        )
        SELECT
          id,
          CONCAT('SEED-', CONVERT(varchar(36), id)),
          source_account_id,
          destination_account_id,
          amount,
          'COMPLETED',
          CONCAT('SEED-', CONVERT(varchar(36), id)),
          NULL,
          NULL,
          DATEADD(
            SECOND,
            -(row_number % 2592000),
            SYSUTCDATETIME()
          ),
          DATEADD(
            SECOND,
            -(row_number % 2592000),
            SYSUTCDATETIME()
          )
        FROM @SeedTransfers;

        INSERT INTO account_movements (
          id,
          account_id,
          transfer_id,
          type,
          amount,
          balance_before,
          balance_after,
          created_at,
          description
        )
        SELECT
          NEWID(),
          source_account_id,
          id,
          'DEBIT',
          amount,
          1000000.0000,
          1000000.0000 - amount,
          DATEADD(
            SECOND,
            -(row_number % 2592000),
            SYSUTCDATETIME()
          ),
          'Movimiento sintético de carga'
        FROM @SeedTransfers

        UNION ALL

        SELECT
          NEWID(),
          destination_account_id,
          id,
          'CREDIT',
          amount,
          1000000.0000,
          1000000.0000 + amount,
          DATEADD(
            SECOND,
            -(row_number % 2592000),
            SYSUTCDATETIME()
          ),
          'Movimiento sintético de carga'
        FROM @SeedTransfers;

        COMMIT TRANSACTION;

      END TRY
      BEGIN CATCH

        IF @@TRANCOUNT > 0
          ROLLBACK TRANSACTION;

        THROW;

      END CATCH;
    `,
    [
      transferCount,
      offset,
      LOAD_ACCOUNT_COUNT,
    ],
  );
}

main().catch((error) => {
  console.error('Error ejecutando seed de volumen:', error);
  process.exit(1);
});