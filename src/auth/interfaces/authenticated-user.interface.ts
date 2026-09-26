import { RoleName } from '../../database/enums.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: RoleName;
}
