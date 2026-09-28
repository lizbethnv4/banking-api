import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '../../database/enums.js';

export class AccountResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '0048217395' })
  accountNumber!: string;

  @ApiProperty({ example: 'María Pérez' })
  holderName!: string;

  @ApiProperty({ example: '0.0000' })
  balance!: string;

  @ApiProperty({ example: 'DOP' })
  currency!: string;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  status!: AccountStatus;
}
