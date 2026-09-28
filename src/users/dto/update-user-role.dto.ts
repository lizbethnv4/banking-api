import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RoleName } from '../../database/enums.js';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: RoleName, example: RoleName.ADMIN })
  @IsEnum(RoleName)
  role!: RoleName;
}
