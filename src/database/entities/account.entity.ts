import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  PrimaryColumn,
  UpdateDateColumn,

} from 'typeorm';
import { AccountStatus } from '../enums.js';


@Entity('accounts')
@Check('CK_accounts_balance_non_negative', '"balance" >= 0')
@Check('CK_accounts_currency', '"currency" = \'DOP\'')
@Index('UQ_accounts_account_number', ['accountNumber'], { unique: true })
export class Account {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  @Generated('uuid')

  id: string;

  @Column({ name: 'account_number', type: 'varchar', length: 20 })
  accountNumber: string;

  @Column({ name: 'holder_name', type: 'nvarchar', length: 200 })
  holderName: string;

  @Column({ type: 'char', length: 3, default: 'DOP' })
  currency: string;

  @Column({ type: 'decimal', precision: 19, scale: 4, default: 0 })
  balance: string;

  @Column({ type: 'varchar', length: 20, default: AccountStatus.ACTIVE })
  status: AccountStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}