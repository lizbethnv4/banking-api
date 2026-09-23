import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1695312000000 implements MigrationInterface {
  name = 'CreateInitialSchema1695312000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE accounts (
        id uniqueidentifier NOT NULL CONSTRAINT DF_accounts_id DEFAULT NEWID(),
        CONSTRAINT PK_accounts PRIMARY KEY (id),
        account_number varchar(20) NOT NULL,
        holder_name nvarchar(200) NOT NULL,
        currency char(3) NOT NULL CONSTRAINT DF_accounts_currency DEFAULT 'DOP',
        balance decimal(19, 4) NOT NULL CONSTRAINT DF_accounts_balance DEFAULT 0,
        status varchar(20) NOT NULL CONSTRAINT DF_accounts_status DEFAULT 'ACTIVE',
        created_at datetime2 NOT NULL CONSTRAINT DF_accounts_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2 NOT NULL CONSTRAINT DF_accounts_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_accounts_account_number UNIQUE (account_number),
        CONSTRAINT CK_accounts_balance_non_negative CHECK (balance >= 0),
        CONSTRAINT CK_accounts_status CHECK (status IN ('ACTIVE', 'BLOCKED', 'CLOSED')),
        CONSTRAINT CK_accounts_currency CHECK (currency = 'DOP')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE transfers (
        id uniqueidentifier NOT NULL CONSTRAINT DF_transfers_id DEFAULT NEWID(),
        CONSTRAINT PK_transfers PRIMARY KEY (id),
        reference varchar(64) NOT NULL,
        source_account_id uniqueidentifier NOT NULL,
        destination_account_id uniqueidentifier NOT NULL,
        amount decimal(19, 4) NOT NULL,
        status varchar(20) NOT NULL CONSTRAINT DF_transfers_status DEFAULT 'PENDING',
        idempotency_key varchar(128) NOT NULL,
        failure_code varchar(64) NULL,
        failure_message nvarchar(500) NULL,
        created_at datetime2 NOT NULL CONSTRAINT DF_transfers_created_at DEFAULT SYSUTCDATETIME(),
        completed_at datetime2 NULL,
        CONSTRAINT UQ_transfers_reference UNIQUE (reference),
        CONSTRAINT UQ_transfers_idempotency_key UNIQUE (idempotency_key),
        CONSTRAINT FK_transfers_source FOREIGN KEY (source_account_id) REFERENCES accounts(id),
        CONSTRAINT FK_transfers_destination FOREIGN KEY (destination_account_id) REFERENCES accounts(id),
        CONSTRAINT CK_transfers_amount CHECK (amount > 0),
        CONSTRAINT CK_transfers_distinct_accounts CHECK (source_account_id <> destination_account_id),
        CONSTRAINT CK_transfers_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IX_transfers_created_at ON transfers (created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IX_transfers_source_created ON transfers (source_account_id, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IX_transfers_destination_created ON transfers (destination_account_id, created_at)
    `);

    await queryRunner.query(`
      CREATE TABLE account_movements (
        id uniqueidentifier NOT NULL CONSTRAINT DF_account_movements_id DEFAULT NEWID(),
        CONSTRAINT PK_account_movements PRIMARY KEY (id),
        account_id uniqueidentifier NOT NULL,
        transfer_id uniqueidentifier NOT NULL,
        type varchar(10) NOT NULL,
        amount decimal(19, 4) NOT NULL,
        balance_before decimal(19, 4) NOT NULL,
        balance_after decimal(19, 4) NOT NULL,
        created_at datetime2 NOT NULL CONSTRAINT DF_account_movements_created_at DEFAULT SYSUTCDATETIME(),
        description nvarchar(250) NULL,
        CONSTRAINT FK_account_movements_account FOREIGN KEY (account_id) REFERENCES accounts(id),
        CONSTRAINT FK_account_movements_transfer FOREIGN KEY (transfer_id) REFERENCES transfers(id),
        CONSTRAINT CK_account_movements_amount CHECK (amount > 0),
        CONSTRAINT CK_account_movements_type CHECK (type IN ('DEBIT', 'CREDIT')),
        CONSTRAINT CK_account_movements_balance_after CHECK (balance_after >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IX_account_movements_account_created
      ON account_movements (account_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IX_account_movements_account_type_created
      ON account_movements (account_id, type, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE batch_processes (
        id uniqueidentifier NOT NULL CONSTRAINT DF_batch_processes_id DEFAULT NEWID(),
        CONSTRAINT PK_batch_processes PRIMARY KEY (id),
        original_file_name nvarchar(260) NOT NULL,
        status varchar(32) NOT NULL CONSTRAINT DF_batch_processes_status DEFAULT 'PENDING',
        total_items int NOT NULL,
        processed_items int NOT NULL CONSTRAINT DF_batch_processes_processed DEFAULT 0,
        successful_items int NOT NULL CONSTRAINT DF_batch_processes_successful DEFAULT 0,
        failed_items int NOT NULL CONSTRAINT DF_batch_processes_failed DEFAULT 0,
        progress_percentage decimal(5, 2) NOT NULL CONSTRAINT DF_batch_processes_progress DEFAULT 0,
        created_at datetime2 NOT NULL CONSTRAINT DF_batch_processes_created_at DEFAULT SYSUTCDATETIME(),
        started_at datetime2 NULL,
        completed_at datetime2 NULL,
        failure_message nvarchar(500) NULL,
        CONSTRAINT CK_batch_processes_status CHECK (status IN (
          'PENDING', 'VALIDATING', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'
        )),
        CONSTRAINT CK_batch_processes_counters CHECK (
          total_items >= 0 AND processed_items >= 0 AND successful_items >= 0 AND failed_items >= 0
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IX_batch_processes_status ON batch_processes (status)
    `);
    await queryRunner.query(`
      CREATE INDEX IX_batch_processes_created_at ON batch_processes (created_at)
    `);

    await queryRunner.query(`
      CREATE TABLE batch_transfer_items (
        id uniqueidentifier NOT NULL CONSTRAINT DF_batch_transfer_items_id DEFAULT NEWID(),
        CONSTRAINT PK_batch_transfer_items PRIMARY KEY (id),
        batch_process_id uniqueidentifier NOT NULL,
        row_number int NOT NULL,
        source_account_number varchar(20) NOT NULL,
        destination_account_number varchar(20) NOT NULL,
        amount decimal(19, 4) NOT NULL,
        idempotency_key varchar(128) NOT NULL,
        status varchar(20) NOT NULL CONSTRAINT DF_batch_transfer_items_status DEFAULT 'PENDING',
        attempt_count int NOT NULL CONSTRAINT DF_batch_transfer_items_attempts DEFAULT 0,
        transfer_id uniqueidentifier NULL,
        error_code varchar(64) NULL,
        error_message nvarchar(500) NULL,
        created_at datetime2 NOT NULL CONSTRAINT DF_batch_transfer_items_created_at DEFAULT SYSUTCDATETIME(),
        processed_at datetime2 NULL,
        CONSTRAINT UQ_batch_transfer_items_row UNIQUE (batch_process_id, row_number),
        CONSTRAINT UQ_batch_transfer_items_idempotency UNIQUE (idempotency_key),
        CONSTRAINT FK_batch_transfer_items_process FOREIGN KEY (batch_process_id) REFERENCES batch_processes(id),
        CONSTRAINT FK_batch_transfer_items_transfer FOREIGN KEY (transfer_id) REFERENCES transfers(id),
        CONSTRAINT CK_batch_transfer_items_amount CHECK (amount > 0),
        CONSTRAINT CK_batch_transfer_items_attempts CHECK (attempt_count >= 0),
        CONSTRAINT CK_batch_transfer_items_status CHECK (status IN (
          'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'RETRYING'
        ))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IX_batch_transfer_items_process_status
      ON batch_transfer_items (batch_process_id, status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE batch_transfer_items`);
    await queryRunner.query(`DROP TABLE batch_processes`);
    await queryRunner.query(`DROP TABLE account_movements`);
    await queryRunner.query(`DROP TABLE transfers`);
    await queryRunner.query(`DROP TABLE accounts`);
  }
}
