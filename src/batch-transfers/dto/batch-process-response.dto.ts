import { ApiProperty } from '@nestjs/swagger';

import {
  BatchItemStatus,
  BatchStatus,
} from '../../database/enums.js';

export class BatchTransferItemResponseDto {
  @ApiProperty()
  rowNumber!: number;

  @ApiProperty({ example: '0048217395' })
  sourceAccountNumber!: string;

  @ApiProperty({ example: '0048217396' })
  destinationAccountNumber!: string;

  @ApiProperty({ example: '1500.0000' })
  amount!: string;

  @ApiProperty({
    enum: BatchItemStatus,
    example: BatchItemStatus.PENDING,
  })
  status!: BatchItemStatus;

  @ApiProperty({ example: 1 })
  attemptCount!: number;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
  })
  transferId!: string | null;

  @ApiProperty({
    example: 'INSUFFICIENT_FUNDS',
    nullable: true,
  })
  errorCode!: string | null;

  @ApiProperty({
    example: 'Insufficient funds',
    nullable: true,
  })
  errorMessage!: string | null;

  @ApiProperty({
    nullable: true,
  })
  processedAt!: Date | null;
}

export class BatchProcessResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'transfers.csv' })
  originalFileName!: string;

  @ApiProperty({
    enum: BatchStatus,
    example: BatchStatus.PROCESSING,
  })
  status!: BatchStatus;

  @ApiProperty({ example: 10000 })
  totalItems!: number;

  @ApiProperty({ example: 7250 })
  processedItems!: number;

  @ApiProperty({ example: 7200 })
  successfulItems!: number;

  @ApiProperty({ example: 50 })
  failedItems!: number;

  @ApiProperty({ example: '72.50' })
  progressPercentage!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ nullable: true })
  completedAt!: Date | null;

  @ApiProperty({
    nullable: true,
    example: null,
  })
  failureMessage!: string | null;
}