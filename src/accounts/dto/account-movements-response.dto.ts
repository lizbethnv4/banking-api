import { ApiProperty } from '@nestjs/swagger';

import { AccountMovementResponseDto } from './account-movement-response.dto.js';

export class PaginationResponseDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 10000 })
  total!: number;

  @ApiProperty({ example: 500 })
  totalPages!: number;
}

export class AccountMovementsResponseDto {
  @ApiProperty({
    type: AccountMovementResponseDto,
    isArray: true,
  })
  data!: AccountMovementResponseDto[];

  @ApiProperty({
    type: PaginationResponseDto,
  })
  pagination!: PaginationResponseDto;
}