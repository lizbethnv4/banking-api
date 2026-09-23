import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'María Pérez', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  holderName!: string;
}
