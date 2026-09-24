import { ApiProperty } from '@nestjs/swagger';

import { AccountStatus } from '../../database/enums.js';
import { AccountMovementResponseDto } from './account-movement-response.dto.js';

export class AccountStatementAccountDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '0048217395' })
  accountNumber!: string;

  @ApiProperty({ example: 'María Pérez' })
  holderName!: string;

  @ApiProperty({ example: 'DOP' })
  currency!: string;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  status!: AccountStatus;
}

export class AccountStatementPeriodDto {
  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 9 })
  month!: number;

  @ApiProperty({ example: '2026-09-01' })
  from!: string;

  @ApiProperty({ example: '2026-09-30' })
  to!: string;
}

export class AccountStatementSummaryDto {
  @ApiProperty({ example: '15000.0000' })
  totalCredits!: string;

  @ApiProperty({ example: '8500.0000' })
  totalDebits!: string;
}

export class AccountStatementResponseDto {
  @ApiProperty({ type: AccountStatementAccountDto })
  account!: AccountStatementAccountDto;

  @ApiProperty({ type: AccountStatementPeriodDto })
  period!: AccountStatementPeriodDto;

  @ApiProperty({ type: AccountStatementSummaryDto })
  summary!: AccountStatementSummaryDto;

  @ApiProperty({
    type: AccountMovementResponseDto,
    isArray: true,
  })
  movements!: AccountMovementResponseDto[];
}