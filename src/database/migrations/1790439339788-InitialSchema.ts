import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1790439339788 implements MigrationInterface {
    name = 'InitialSchema1790439339788'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "accounts" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_5a7a02c20412299d198e097a8fe" DEFAULT NEWSEQUENTIALID(), "account_number" varchar(20) NOT NULL, "holder_name" nvarchar(200) NOT NULL, "currency" char(3) NOT NULL CONSTRAINT "DF_618a63a50985b99b283b3bead18" DEFAULT 'DOP', "balance" decimal(19,4) NOT NULL CONSTRAINT "DF_abd224f8f01c72d53b1d76fb258" DEFAULT 0, "status" varchar(20) NOT NULL CONSTRAINT "DF_ecd806309a44545de35344424ee" DEFAULT 'ACTIVE', "created_at" datetime2 NOT NULL CONSTRAINT "DF_359eb8520e0cc17e8600456f7d5" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_2aa2fcea3177123a1a9413be65c" DEFAULT getdate(), CONSTRAINT "CK_accounts_currency" CHECK ("currency" = 'DOP'), CONSTRAINT "CK_accounts_balance_non_negative" CHECK ("balance" >= 0), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_accounts_account_number" ON "accounts" ("account_number") `);
        await queryRunner.query(`CREATE TABLE "transfers" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_f712e908b465e0085b4408cabc3" DEFAULT NEWSEQUENTIALID(), "reference" varchar(64) NOT NULL, "source_account_id" uniqueidentifier NOT NULL, "destination_account_id" uniqueidentifier NOT NULL, "amount" decimal(19,4) NOT NULL, "status" varchar(20) NOT NULL CONSTRAINT "DF_5a74701d10eb1b73b47f1d38af2" DEFAULT 'PENDING', "idempotency_key" varchar(128) NOT NULL, "failure_code" varchar(64), "failure_message" nvarchar(500), "created_at" datetime2 NOT NULL CONSTRAINT "DF_5dfa58d7d113aaa56d6a717c1e5" DEFAULT getdate(), "completed_at" datetime2, CONSTRAINT "CK_transfers_distinct_accounts" CHECK ("source_account_id" <> "destination_account_id"), CONSTRAINT "CK_transfers_amount" CHECK ("amount" > 0), CONSTRAINT "PK_f712e908b465e0085b4408cabc3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_transfers_destination_created" ON "transfers" ("destination_account_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IX_transfers_source_created" ON "transfers" ("source_account_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IX_transfers_created_at" ON "transfers" ("created_at") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_transfers_idempotency_key" ON "transfers" ("idempotency_key") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_transfers_reference" ON "transfers" ("reference") `);
        await queryRunner.query(`CREATE TABLE "account_movements" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_c926e307c87d5729d5d85b6db1e" DEFAULT NEWSEQUENTIALID(), "account_id" uniqueidentifier NOT NULL, "transfer_id" uniqueidentifier NOT NULL, "type" varchar(10) NOT NULL, "amount" decimal(19,4) NOT NULL, "balance_before" decimal(19,4) NOT NULL, "balance_after" decimal(19,4) NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_efafe3b4ef6c1d685a00059ea59" DEFAULT getdate(), "description" nvarchar(250), CONSTRAINT "CK_account_movements_amount" CHECK ("amount" > 0), CONSTRAINT "PK_c926e307c87d5729d5d85b6db1e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_account_movements_account_type_created" ON "account_movements" ("account_id", "type", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IX_account_movements_account_created" ON "account_movements" ("account_id", "created_at") `);
        await queryRunner.query(`CREATE TABLE "batch_processes" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_76de1b5f42a027888acca374a50" DEFAULT NEWSEQUENTIALID(), "original_file_name" nvarchar(260) NOT NULL, "status" varchar(32) NOT NULL CONSTRAINT "DF_0b951d2b72fb74a1fdcff9e64bd" DEFAULT 'PENDING', "total_items" int NOT NULL, "processed_items" int NOT NULL CONSTRAINT "DF_2d18a3c3644b14bd541417013e6" DEFAULT 0, "successful_items" int NOT NULL CONSTRAINT "DF_2cb0728eef0f832baafbfadc670" DEFAULT 0, "failed_items" int NOT NULL CONSTRAINT "DF_50ddf560d1c9b7f349103ef7909" DEFAULT 0, "progress_percentage" decimal(5,2) NOT NULL CONSTRAINT "DF_7df8220fa478d7b8b92426919d3" DEFAULT 0, "created_at" datetime2 NOT NULL, "started_at" datetime2, "completed_at" datetime2, "failure_message" nvarchar(500), CONSTRAINT "CK_batch_processes_counters" CHECK ("total_items" >= 0 AND "processed_items" >= 0 AND "successful_items" >= 0 AND "failed_items" >= 0), CONSTRAINT "PK_76de1b5f42a027888acca374a50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_batch_processes_created_at" ON "batch_processes" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IX_batch_processes_status" ON "batch_processes" ("status") `);
        await queryRunner.query(`CREATE TABLE "batch_transfer_items" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_a477b1c43359f479d5f8a4091d3" DEFAULT NEWSEQUENTIALID(), "batch_process_id" uniqueidentifier NOT NULL, "row_number" int NOT NULL, "source_account_number" varchar(20) NOT NULL, "destination_account_number" varchar(20) NOT NULL, "amount" decimal(19,4) NOT NULL, "idempotency_key" varchar(128) NOT NULL, "status" varchar(20) NOT NULL CONSTRAINT "DF_81e2263d30eeba3c481c37ea44b" DEFAULT 'PENDING', "attempt_count" int NOT NULL CONSTRAINT "DF_c07773bf42059ed8a3e0246bef0" DEFAULT 0, "transfer_id" uniqueidentifier, "error_code" varchar(64), "error_message" nvarchar(500), "created_at" datetime2 NOT NULL CONSTRAINT "DF_b0598d4f19b28512ef2f2602270" DEFAULT getdate(), "processed_at" datetime2, CONSTRAINT "CK_batch_transfer_items_attempts" CHECK ("attempt_count" >= 0), CONSTRAINT "CK_batch_transfer_items_amount" CHECK ("amount" > 0), CONSTRAINT "PK_a477b1c43359f479d5f8a4091d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_batch_transfer_items_process_status" ON "batch_transfer_items" ("batch_process_id", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_batch_transfer_items_idempotency" ON "batch_transfer_items" ("idempotency_key") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_batch_transfer_items_row" ON "batch_transfer_items" ("batch_process_id", "row_number") `);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_c1433d71a4838793a49dcad46ab" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(50) NOT NULL, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_a3ffb1c0c8416b9fc6f907b7433" DEFAULT NEWSEQUENTIALID(), "role_id" uniqueidentifier NOT NULL, "name" nvarchar(255) NOT NULL, "email" nvarchar(255) NOT NULL, "password_hash" nvarchar(255) NOT NULL, "status" nvarchar(20) NOT NULL CONSTRAINT "DF_3676155292d72c67cd4e090514f" DEFAULT 'ACTIVE', "created_at" datetime2 NOT NULL CONSTRAINT "DF_c9b5b525a96ddc2c5647d7f7fa5" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_6d596d799f9cb9dac6f7bf7c23c" DEFAULT getdate(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transfers" ADD CONSTRAINT "FK_430dc3ea0fd856beb23d7e1fc5e" FOREIGN KEY ("source_account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transfers" ADD CONSTRAINT "FK_f684549b075c486c901e179e377" FOREIGN KEY ("destination_account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_movements" ADD CONSTRAINT "FK_23cbb97c1985fbaf36647fcd345" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_movements" ADD CONSTRAINT "FK_33b9d2f6e993b666b9331199762" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "batch_transfer_items" ADD CONSTRAINT "FK_dc1e017456bdc6a71ba720b315c" FOREIGN KEY ("batch_process_id") REFERENCES "batch_processes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "batch_transfer_items" ADD CONSTRAINT "FK_564ac07ee015777a4ca2de5c774" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
        await queryRunner.query(`ALTER TABLE "batch_transfer_items" DROP CONSTRAINT "FK_564ac07ee015777a4ca2de5c774"`);
        await queryRunner.query(`ALTER TABLE "batch_transfer_items" DROP CONSTRAINT "FK_dc1e017456bdc6a71ba720b315c"`);
        await queryRunner.query(`ALTER TABLE "account_movements" DROP CONSTRAINT "FK_33b9d2f6e993b666b9331199762"`);
        await queryRunner.query(`ALTER TABLE "account_movements" DROP CONSTRAINT "FK_23cbb97c1985fbaf36647fcd345"`);
        await queryRunner.query(`ALTER TABLE "transfers" DROP CONSTRAINT "FK_f684549b075c486c901e179e377"`);
        await queryRunner.query(`ALTER TABLE "transfers" DROP CONSTRAINT "FK_430dc3ea0fd856beb23d7e1fc5e"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP INDEX "UQ_batch_transfer_items_row" ON "batch_transfer_items"`);
        await queryRunner.query(`DROP INDEX "UQ_batch_transfer_items_idempotency" ON "batch_transfer_items"`);
        await queryRunner.query(`DROP INDEX "IX_batch_transfer_items_process_status" ON "batch_transfer_items"`);
        await queryRunner.query(`DROP TABLE "batch_transfer_items"`);
        await queryRunner.query(`DROP INDEX "IX_batch_processes_status" ON "batch_processes"`);
        await queryRunner.query(`DROP INDEX "IX_batch_processes_created_at" ON "batch_processes"`);
        await queryRunner.query(`DROP TABLE "batch_processes"`);
        await queryRunner.query(`DROP INDEX "IX_account_movements_account_created" ON "account_movements"`);
        await queryRunner.query(`DROP INDEX "IX_account_movements_account_type_created" ON "account_movements"`);
        await queryRunner.query(`DROP TABLE "account_movements"`);
        await queryRunner.query(`DROP INDEX "UQ_transfers_reference" ON "transfers"`);
        await queryRunner.query(`DROP INDEX "UQ_transfers_idempotency_key" ON "transfers"`);
        await queryRunner.query(`DROP INDEX "IX_transfers_created_at" ON "transfers"`);
        await queryRunner.query(`DROP INDEX "IX_transfers_source_created" ON "transfers"`);
        await queryRunner.query(`DROP INDEX "IX_transfers_destination_created" ON "transfers"`);
        await queryRunner.query(`DROP TABLE "transfers"`);
        await queryRunner.query(`DROP INDEX "UQ_accounts_account_number" ON "accounts"`);
        await queryRunner.query(`DROP TABLE "accounts"`);
    }

}
