import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifyBatchProcessCreatedAt1790303972309 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          DECLARE @constraintName NVARCHAR(128);
      
          SELECT @constraintName = dc.name
          FROM sys.default_constraints dc
          INNER JOIN sys.columns c
            ON c.default_object_id = dc.object_id
          INNER JOIN sys.tables t
            ON t.object_id = c.object_id
          WHERE t.name = 'batch_processes'
            AND c.name = 'created_at';
      
          IF @constraintName IS NOT NULL
          BEGIN
            EXEC(
              'ALTER TABLE batch_processes DROP CONSTRAINT ['
              + @constraintName
              + ']'
            );
          END;
        `);
      }

      public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE batch_processes
          ADD DEFAULT sysutcdatetime() FOR created_at;
        `);
      }

}
