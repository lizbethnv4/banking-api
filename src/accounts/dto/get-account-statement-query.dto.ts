import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetAccountStatementQueryDto {
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