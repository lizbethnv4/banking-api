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
import { MovementType } from '../enums.js';
import { Account } from './account.entity.js';
import { Transfer } from './transfer.entity.js';

@Entity('account_movements')
@Check('CK_account_movements_amount', '"amount" > 0')
@Index('IX_account_movements_account_created', ['accountId', 'createdAt'])
@Index('IX_account_movements_account_type_created', [
  'accountId',
  'type',
  'createdAt',
])
export class AccountMovement {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  @Generated('uuid')
  id: string;

  @ManyToOne(() => Account, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'account_id', type: 'uniqueidentifier' })
  accountId: string;

  @ManyToOne(() => Transfer, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'transfer_id' })
  transfer: Transfer;

  @Column({ name: 'transfer_id', type: 'uniqueidentifier' })
  transferId: string;

  @Column({ type: 'varchar', length: 10 })
  type: MovementType;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  amount: string;

  @Column({ name: 'balance_before', type: 'decimal', precision: 19, scale: 4 })
  balanceBefore: string;

  @Column({ name: 'balance_after', type: 'decimal', precision: 19, scale: 4 })
  balanceAfter: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @Column({ type: 'nvarchar', length: 250, nullable: true })
  description: string | null;
}
