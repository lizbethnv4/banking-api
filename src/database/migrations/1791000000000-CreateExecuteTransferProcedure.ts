import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExecuteTransferProcedure1791000000000
  implements MigrationInterface
{
  name = 'CreateExecuteTransferProcedure1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER PROCEDURE dbo.usp_execute_transfer
        @source_account_id uniqueidentifier,
        @destination_account_id uniqueidentifier,
        @amount decimal(19, 4),
        @idempotency_key varchar(128),
        @reference varchar(64)
      AS
      BEGIN
        SET NOCOUNT ON;
        SET XACT_ABORT OFF;

        IF @source_account_id = @destination_account_id
        BEGIN
          SELECT
            'SAME_ACCOUNT_TRANSFER' AS result_code,
            CAST(NULL AS uniqueidentifier) AS id,
            CAST(NULL AS varchar(64)) AS reference,
            CAST(NULL AS uniqueidentifier) AS source_account_id,
            CAST(NULL AS uniqueidentifier) AS destination_account_id,
            CAST(NULL AS decimal(19, 4)) AS amount,
            CAST(NULL AS varchar(20)) AS status,
            CAST(NULL AS varchar(128)) AS idempotency_key,
            CAST(NULL AS varchar(64)) AS failure_code,
            CAST(NULL AS nvarchar(500)) AS failure_message,
            CAST(NULL AS datetime2) AS created_at,
            CAST(NULL AS datetime2) AS completed_at;
          RETURN;
        END;

        IF @amount <= 0
        BEGIN
          SELECT
            'INVALID_AMOUNT' AS result_code,
            CAST(NULL AS uniqueidentifier) AS id,
            CAST(NULL AS varchar(64)) AS reference,
            CAST(NULL AS uniqueidentifier) AS source_account_id,
            CAST(NULL AS uniqueidentifier) AS destination_account_id,
            CAST(NULL AS decimal(19, 4)) AS amount,
            CAST(NULL AS varchar(20)) AS status,
            CAST(NULL AS varchar(128)) AS idempotency_key,
            CAST(NULL AS varchar(64)) AS failure_code,
            CAST(NULL AS nvarchar(500)) AS failure_message,
            CAST(NULL AS datetime2) AS created_at,
            CAST(NULL AS datetime2) AS completed_at;
          RETURN;
        END;

        BEGIN TRY
          BEGIN TRANSACTION;

          DECLARE @existing_id uniqueidentifier;
          DECLARE @existing_source uniqueidentifier;
          DECLARE @existing_destination uniqueidentifier;
          DECLARE @existing_amount decimal(19, 4);

          SELECT
            @existing_id = id,
            @existing_source = source_account_id,
            @existing_destination = destination_account_id,
            @existing_amount = amount
          FROM transfers WITH (UPDLOCK, HOLDLOCK)
          WHERE idempotency_key = @idempotency_key;

          IF @existing_id IS NOT NULL
          BEGIN
            ROLLBACK TRANSACTION;

            IF @existing_source = @source_account_id
              AND @existing_destination = @destination_account_id
              AND @existing_amount = @amount
            BEGIN
              SELECT
                'OK' AS result_code,
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
              FROM transfers
              WHERE id = @existing_id;
              RETURN;
            END;

            SELECT
              'IDEMPOTENCY_KEY_CONFLICT' AS result_code,
              CAST(NULL AS uniqueidentifier) AS id,
              CAST(NULL AS varchar(64)) AS reference,
              CAST(NULL AS uniqueidentifier) AS source_account_id,
              CAST(NULL AS uniqueidentifier) AS destination_account_id,
              CAST(NULL AS decimal(19, 4)) AS amount,
              CAST(NULL AS varchar(20)) AS status,
              CAST(NULL AS varchar(128)) AS idempotency_key,
              CAST(NULL AS varchar(64)) AS failure_code,
              CAST(NULL AS nvarchar(500)) AS failure_message,
              CAST(NULL AS datetime2) AS created_at,
              CAST(NULL AS datetime2) AS completed_at;
            RETURN;
          END;

          DECLARE @locked TABLE (
            id uniqueidentifier NOT NULL,
            balance decimal(19, 4) NOT NULL,
            status varchar(20) NOT NULL
          );

          INSERT INTO @locked (id, balance, status)
          SELECT id, balance, status
          FROM accounts WITH (UPDLOCK, ROWLOCK, HOLDLOCK)
          WHERE id IN (@source_account_id, @destination_account_id)
          ORDER BY id;

          DECLARE @source_balance decimal(19, 4);
          DECLARE @source_status varchar(20);
          DECLARE @destination_balance decimal(19, 4);
          DECLARE @destination_status varchar(20);

          SELECT
            @source_balance = balance,
            @source_status = status
          FROM @locked
          WHERE id = @source_account_id;

          SELECT
            @destination_balance = balance,
            @destination_status = status
          FROM @locked
          WHERE id = @destination_account_id;

          DECLARE @result_code varchar(64);

          IF @source_balance IS NULL
            SET @result_code = 'SOURCE_ACCOUNT_NOT_FOUND';
          ELSE IF @destination_balance IS NULL
            SET @result_code = 'DESTINATION_ACCOUNT_NOT_FOUND';
          ELSE IF @source_status <> 'ACTIVE'
            SET @result_code = 'SOURCE_ACCOUNT_NOT_ACTIVE';
          ELSE IF @destination_status <> 'ACTIVE'
            SET @result_code = 'DESTINATION_ACCOUNT_NOT_ACTIVE';
          ELSE IF @source_balance < @amount
            SET @result_code = 'INSUFFICIENT_BALANCE';

          IF @result_code IS NOT NULL
          BEGIN
            ROLLBACK TRANSACTION;
            SELECT
              @result_code AS result_code,
              CAST(NULL AS uniqueidentifier) AS id,
              CAST(NULL AS varchar(64)) AS reference,
              CAST(NULL AS uniqueidentifier) AS source_account_id,
              CAST(NULL AS uniqueidentifier) AS destination_account_id,
              CAST(NULL AS decimal(19, 4)) AS amount,
              CAST(NULL AS varchar(20)) AS status,
              CAST(NULL AS varchar(128)) AS idempotency_key,
              CAST(NULL AS varchar(64)) AS failure_code,
              CAST(NULL AS nvarchar(500)) AS failure_message,
              CAST(NULL AS datetime2) AS created_at,
              CAST(NULL AS datetime2) AS completed_at;
            RETURN;
          END;

          DECLARE @source_balance_after decimal(19, 4) =
            @source_balance - @amount;
          DECLARE @destination_balance_after decimal(19, 4) =
            @destination_balance + @amount;
          DECLARE @description nvarchar(250) =
            N'Transferencia de fondos de '
            + CONVERT(varchar(36), @source_account_id)
            + N' a '
            + CONVERT(varchar(36), @destination_account_id);
          DECLARE @inserted_ids TABLE (id uniqueidentifier NOT NULL);

          INSERT INTO transfers (
            reference,
            source_account_id,
            destination_account_id,
            amount,
            status,
            idempotency_key,
            completed_at
          )
          OUTPUT inserted.id INTO @inserted_ids (id)
          VALUES (
            @reference,
            @source_account_id,
            @destination_account_id,
            @amount,
            'COMPLETED',
            @idempotency_key,
            GETDATE()
          );

          DECLARE @transfer_id uniqueidentifier;
          SELECT @transfer_id = id FROM @inserted_ids;

          UPDATE accounts
          SET
            balance = @source_balance_after,
            updated_at = GETDATE()
          WHERE id = @source_account_id;

          UPDATE accounts
          SET
            balance = @destination_balance_after,
            updated_at = GETDATE()
          WHERE id = @destination_account_id;

          INSERT INTO account_movements (
            account_id,
            transfer_id,
            type,
            amount,
            balance_before,
            balance_after,
            description
          )
          VALUES
            (
              @source_account_id,
              @transfer_id,
              'DEBIT',
              @amount,
              @source_balance,
              @source_balance_after,
              @description
            ),
            (
              @destination_account_id,
              @transfer_id,
              'CREDIT',
              @amount,
              @destination_balance,
              @destination_balance_after,
              @description
            );

          COMMIT TRANSACTION;

          SELECT
            'OK' AS result_code,
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
          FROM transfers
          WHERE id = @transfer_id;
        END TRY
        BEGIN CATCH
          IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

          IF ERROR_NUMBER() = 1205
            THROW;

          IF ERROR_NUMBER() IN (2601, 2627)
          BEGIN
            DECLARE @winner_id uniqueidentifier;
            DECLARE @winner_source uniqueidentifier;
            DECLARE @winner_destination uniqueidentifier;
            DECLARE @winner_amount decimal(19, 4);

            SELECT
              @winner_id = id,
              @winner_source = source_account_id,
              @winner_destination = destination_account_id,
              @winner_amount = amount
            FROM transfers
            WHERE idempotency_key = @idempotency_key;

            IF @winner_id IS NULL
              THROW;

            IF @winner_source = @source_account_id
              AND @winner_destination = @destination_account_id
              AND @winner_amount = @amount
            BEGIN
              SELECT
                'OK' AS result_code,
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
              FROM transfers
              WHERE id = @winner_id;
              RETURN;
            END;

            SELECT
              'IDEMPOTENCY_KEY_CONFLICT' AS result_code,
              CAST(NULL AS uniqueidentifier) AS id,
              CAST(NULL AS varchar(64)) AS reference,
              CAST(NULL AS uniqueidentifier) AS source_account_id,
              CAST(NULL AS uniqueidentifier) AS destination_account_id,
              CAST(NULL AS decimal(19, 4)) AS amount,
              CAST(NULL AS varchar(20)) AS status,
              CAST(NULL AS varchar(128)) AS idempotency_key,
              CAST(NULL AS varchar(64)) AS failure_code,
              CAST(NULL AS nvarchar(500)) AS failure_message,
              CAST(NULL AS datetime2) AS created_at,
              CAST(NULL AS datetime2) AS completed_at;
            RETURN;
          END;

          THROW;
        END CATCH;
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP PROCEDURE IF EXISTS dbo.usp_execute_transfer;
    `);
  }
}
