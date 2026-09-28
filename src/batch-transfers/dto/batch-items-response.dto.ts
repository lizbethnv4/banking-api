import { ApiProperty } from '@nestjs/swagger';

import { BatchTransferItemResponseDto } from './batch-process-response.dto.js';

class BatchItemsPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class BatchItemsResponseDto {
  @ApiProperty({
    type: BatchTransferItemResponseDto,
    isArray: true,
  })
  data!: BatchTransferItemResponseDto[];

  @ApiProperty({
    type: BatchItemsPaginationDto,
  })
  pagination!: BatchItemsPaginationDto;
}