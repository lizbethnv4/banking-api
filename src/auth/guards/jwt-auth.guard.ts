import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DomainException } from '../../common/errors/domain.exception.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw new DomainException(
        'UNAUTHORIZED',
        'No autenticado.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return user;
  }
}
