import { ApiProperty } from '@nestjs/swagger';

import { BatchStatus } from '../../database/enums.js';

export class CreateBatchResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'transfers.csv' })
  originalFileName!: string;

  @ApiProperty({
    enum: BatchStatus,
    example: BatchStatus.PENDING,
  })
  status!: BatchStatus;

  @ApiProperty({ example: 10000 })
  totalItems!: number;

  @ApiProperty({ example: 0 })
  processedItems!: number;

  @ApiProperty({ example: 0 })
  successfulItems!: number;

  @ApiProperty({ example: 0 })
  failedItems!: number;

  @ApiProperty({ example: '0.00' })
  progressPercentage!: string;

  @ApiProperty()
  createdAt!: Date;
}