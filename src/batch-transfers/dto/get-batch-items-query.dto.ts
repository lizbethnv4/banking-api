import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { BatchItemStatus } from '../../database/enums.js';

export class GetBatchItemsQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({
    enum: BatchItemStatus,
  })
  @IsOptional()
  @IsEnum(BatchItemStatus)
  status?: BatchItemStatus;
}