import { ApiProperty } from '@nestjs/swagger';
import { RoleName, UserStatus } from '../../database/enums.js';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ enum: RoleName, example: RoleName.USER })
  role!: RoleName;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status!: UserStatus;
}
