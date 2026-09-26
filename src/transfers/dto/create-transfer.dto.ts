import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, Matches, MaxLength } from "class-validator";

export class CreateTransferDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sourceAccountId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  destinationAccountId: string;

  @ApiProperty({ example: '2500.0000' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/, {
    message: 'amount must be a valid decimal with up to 4 decimal places',
  })
  amount: string;

  @ApiProperty({ example: 'idem-key-001', maxLength: 128 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  idempotencyKey: string;
}