import { ApiProperty } from '@nestjs/swagger';

import { MovementType } from '../../database/enums.js';

export class AccountMovementResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  transferId!: string;

  @ApiProperty({
    enum: MovementType,
    example: MovementType.DEBIT,
  })
  type!: MovementType;

  @ApiProperty({ example: '2500.0000' })
  amount!: string;

  @ApiProperty({ example: '10000.0000' })
  balanceBefore!: string;

  @ApiProperty({ example: '7500.0000' })
  balanceAfter!: string;

  @ApiProperty({
    example: 'Transferencia realizada',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    example: '2026-09-24T15:30:00.000Z',
  })
  createdAt!: Date;
}