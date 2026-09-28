import { ApiProperty } from '@nestjs/swagger';
import { TransferStatus } from '../../database/enums.js';

export class TransferResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'TRX-3f1c2a90-7b4e-4d1a-9c2b-1a2b3c4d5e6f' })
  reference!: string;

  @ApiProperty({ format: 'uuid' })
  sourceAccountId!: string;

  @ApiProperty({ format: 'uuid' })
  destinationAccountId!: string;

  @ApiProperty({ example: '2500.0000' })
  amount!: string;

  @ApiProperty({ enum: TransferStatus, example: TransferStatus.COMPLETED })
  status!: TransferStatus;

  @ApiProperty({ example: 'idem-key-001', maxLength: 128 })
  idempotencyKey!: string;

  @ApiProperty({ nullable: true, example: null })
  failureCode!: string | null;

  @ApiProperty({ nullable: true, example: null })
  failureMessage!: string | null;

  @ApiProperty({ example: '2026-09-24T15:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ nullable: true, example: '2026-09-24T15:30:00.000Z' })
  completedAt!: Date | null;
}
