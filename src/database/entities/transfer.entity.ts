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
import { TransferStatus } from '../enums.js';
import { Account } from './account.entity.js';

@Entity('transfers')
@Check('CK_transfers_amount', '"amount" > 0')
@Check(
  'CK_transfers_distinct_accounts',
  '"source_account_id" <> "destination_account_id"',
)
@Index('UQ_transfers_reference', ['reference'], { unique: true })
@Index('UQ_transfers_idempotency_key', ['idempotencyKey'], { unique: true })
@Index('IX_transfers_created_at', ['createdAt'])
@Index('IX_transfers_source_created', ['sourceAccountId', 'createdAt'])
@Index('IX_transfers_destination_created', ['destinationAccountId', 'createdAt'])
export class Transfer {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  @Generated('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  reference: string;

  @ManyToOne(() => Account, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'source_account_id' })
  sourceAccount: Account;

  @Column({ name: 'source_account_id', type: 'uniqueidentifier' })
  sourceAccountId: string;

  @ManyToOne(() => Account, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'destination_account_id' })
  destinationAccount: Account;

  @Column({ name: 'destination_account_id', type: 'uniqueidentifier' })
  destinationAccountId: string;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  amount: string;

  @Column({ type: 'varchar', length: 20, default: TransferStatus.PENDING })
  status: TransferStatus;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 128 })
  idempotencyKey: string;

  @Column({ name: 'failure_code', type: 'varchar', length: 64, nullable: true })
  failureCode: string | null;

  @Column({
    name: 'failure_message',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  failureMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'datetime2', nullable: true })
  completedAt: Date | null;
}
