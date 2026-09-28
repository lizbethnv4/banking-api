import { User } from '../database/entities/user.entity.js';
import { RoleName } from '../database/enums.js';
import { UserResponseDto } from './dto/user-response.dto.js';

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name as RoleName,
    status: user.status,
  };
}
