import { IsNotEmpty, IsUUID, IsString, Matches, MaxLength } from "class-validator";

export class CreateTransferDto {
  @IsUUID()
  sourceAccountId: string;

  @IsUUID()
  destinationAccountId: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/, {
    message: 'amount must be a valid decimal with up to 4 decimal places',
  })
  amount: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  idempotencyKey: string;
}