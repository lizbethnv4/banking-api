import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { BatchItemStatus } from '../enums.js';
import { BatchProcess } from './batch-process.entity.js';
import { Transfer } from './transfer.entity.js';

@Entity('batch_transfer_items')
@Check('CK_batch_transfer_items_amount', '"amount" > 0')
@Check('CK_batch_transfer_items_attempts', '"attempt_count" >= 0')
@Index('UQ_batch_transfer_items_row', ['batchProcessId', 'rowNumber'], {
  unique: true,
})
@Index('UQ_batch_transfer_items_idempotency', ['idempotencyKey'], {
  unique: true,
})
@Index('IX_batch_transfer_items_process_status', ['batchProcessId', 'status'])
export class BatchTransferItem {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  @Generated('uuid')
  id: string;

  @ManyToOne(() => BatchProcess, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'batch_process_id' })
  batchProcess: BatchProcess;

  @Column({ name: 'batch_process_id', type: 'uniqueidentifier' })
  batchProcessId: string;

  @Column({ name: 'row_number', type: 'int' })
  rowNumber: number;

  @Column({ name: 'source_account_number', type: 'varchar', length: 20 })
  sourceAccountNumber: string;

  @Column({ name: 'destination_account_number', type: 'varchar', length: 20 })
  destinationAccountNumber: string;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  amount: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 128 })
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 20, default: BatchItemStatus.PENDING })
  status: BatchItemStatus;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @ManyToOne(() => Transfer, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'transfer_id' })
  transfer: Transfer | null;

  @Column({ name: 'transfer_id', type: 'uniqueidentifier', nullable: true })
  transferId: string | null;

  @Column({ name: 'error_code', type: 'varchar', length: 64, nullable: true })
  errorCode: string | null;

  @Column({
    name: 'error_message',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @Column({ name: 'processed_at', type: 'datetime2', nullable: true })
  processedAt: Date | null;
}
