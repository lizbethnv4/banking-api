import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainException } from '../common/errors/domain.exception.js';
import { Role } from '../database/entities/role.entity.js';
import { User } from '../database/entities/user.entity.js';
import { RoleName } from '../database/enums.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { toUserResponse } from './users.mapper.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async updateRole(
    id: string,
    updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { role: true },
    });

    if (!user) {
      throw new DomainException(
        'USER_NOT_FOUND',
        'No existe un usuario con ese identificador.',
        HttpStatus.NOT_FOUND,
      );
    }

    const role = await this.roleRepository.findOne({
      where: { name: updateUserRoleDto.role },
    });

    if (!role) {
      throw new DomainException(
        'ROLE_NOT_FOUND',
        'El rol solicitado no existe.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      user.role.name === RoleName.ADMIN &&
      updateUserRoleDto.role === RoleName.USER
    ) {
      const adminCount = await this.userRepository.count({
        where: { roleId: user.roleId },
      });

      if (adminCount <= 1) {
        throw new DomainException(
          'LAST_ADMIN',
          'No se puede degradar al último administrador.',
          HttpStatus.CONFLICT,
        );
      }
    }

    if (user.roleId === role.id) {
      return toUserResponse(user);
    }

    user.roleId = role.id;
    user.role = role;
    const saved = await this.userRepository.save(user);

    return toUserResponse(saved);
  }
}
