import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '../../database/enums.js';

export class AccountOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '0010000001' })
  accountNumber!: string;

  @ApiProperty({ example: 'John Doe' })
  holderName!: string;

  @ApiProperty({ example: '10000.0000' })
  balance!: string;

  @ApiProperty({ example: 'DOP' })
  currency!: string;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  status!: AccountStatus;
}
