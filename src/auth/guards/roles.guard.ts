import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainException } from '../../common/errors/domain.exception.js';
import { RoleName } from '../../database/enums.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new DomainException(
        'FORBIDDEN',
        'No tiene permisos para realizar esta acción.',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
