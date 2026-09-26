import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetAccountStatementPeriodQueryDto {
  @ApiProperty({
    example: 2026,
    description: 'Statement year',
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiProperty({
    example: 9,
    minimum: 1,
    maximum: 12,
    description: 'Statement month',
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class GetAccountStatementQueryDto extends GetAccountStatementPeriodQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
    description: 'Página de movimientos. Por defecto 1.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : Number(value),
  )
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Movimientos por página. Por defecto 20, máximo 100.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
