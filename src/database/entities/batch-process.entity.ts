import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { BatchStatus } from '../enums.js';

@Entity('batch_processes')
@Check(
  'CK_batch_processes_counters',
  '"total_items" >= 0 AND "processed_items" >= 0 AND "successful_items" >= 0 AND "failed_items" >= 0',
)
@Index('IX_batch_processes_status', ['status'])
@Index('IX_batch_processes_created_at', ['createdAt'])
export class BatchProcess {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  @Generated('uuid')
  id: string;

  @Column({ name: 'original_file_name', type: 'nvarchar', length: 260 })
  originalFileName: string;

  @Column({ type: 'varchar', length: 32, default: BatchStatus.PENDING })
  status: BatchStatus;

  @Column({ name: 'total_items', type: 'int' })
  totalItems: number;

  @Column({ name: 'processed_items', type: 'int', default: 0 })
  processedItems: number;

  @Column({ name: 'successful_items', type: 'int', default: 0 })
  successfulItems: number;

  @Column({ name: 'failed_items', type: 'int', default: 0 })
  failedItems: number;

  @Column({
    name: 'progress_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  progressPercentage: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @Column({ name: 'started_at', type: 'datetime2', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'datetime2', nullable: true })
  completedAt: Date | null;

  @Column({
    name: 'failure_message',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  failureMessage: string | null;
}
