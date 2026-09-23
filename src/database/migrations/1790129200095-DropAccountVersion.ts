import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropAccountVersion1790129200095 implements MigrationInterface {
  name = 'DropAccountVersion1790129200095';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.accounts', 'version') IS NOT NULL
      BEGIN
        DECLARE @defaultName sysname;
        DECLARE @dropDefaultSql nvarchar(max);

        SELECT @defaultName = dc.name
        FROM sys.default_constraints dc
        INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID(N'dbo.accounts')
          AND c.name = N'version';

        IF @defaultName IS NOT NULL
        BEGIN
          SET @dropDefaultSql =
            N'ALTER TABLE dbo.accounts DROP CONSTRAINT ' + QUOTENAME(@defaultName);
          EXEC sp_executesql @dropDefaultSql;
        END

        ALTER TABLE dbo.accounts DROP COLUMN version;
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.accounts', 'version') IS NULL
      BEGIN
        ALTER TABLE dbo.accounts ADD version int NOT NULL CONSTRAINT DF_accounts_version DEFAULT 1;
      END
    `);
  }
}
