import { ApiProperty } from '@nestjs/swagger';
import { BatchStatus } from '../../database/enums.js';

export class BatchProcessOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'transfers-10000.csv' })
  originalFileName!: string;

  @ApiProperty({ enum: BatchStatus, example: BatchStatus.COMPLETED })
  status!: BatchStatus;

  @ApiProperty({ example: 10000 })
  totalItems!: number;

  @ApiProperty({ example: 10000 })
  processedItems!: number;

  @ApiProperty({ example: 9980 })
  successfulItems!: number;

  @ApiProperty({ example: 20 })
  failedItems!: number;

  @ApiProperty({ example: '2026-09-24T15:30:00.000Z' })
  createdAt!: Date;
}
