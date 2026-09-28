import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { MovementType } from '../../database/enums.js';

export class GetAccountMovementsQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,4})?$/, {
    message: 'minAmount debe tener máximo 4 decimales',
  })
  minAmount?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,4})?$/, {
    message: 'maxAmount debe tener máximo 4 decimales',
  })
  maxAmount?: string;
}