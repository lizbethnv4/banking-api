import { ApiProperty } from '@nestjs/swagger';

export class AccountBalanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ example: '0048217395' })
  accountNumber!: string;

  @ApiProperty({ example: '0.0000' })
  balance!: string;

  @ApiProperty({ example: 'DOP' })
  currency!: string;
}
