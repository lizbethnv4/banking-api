import { User } from '../database/entities/user.entity.js';
import { RoleName } from '../database/enums.js';
import { RegisterResponseDto } from './dto/register-response.dto.js';

export function toRegisterResponse(user: User): RegisterResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name as RoleName,
    status: user.status,
  };
}
