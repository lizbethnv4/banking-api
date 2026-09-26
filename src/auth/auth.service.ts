import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { DomainException } from '../common/errors/domain.exception.js';
import { Role } from '../database/entities/role.entity.js';
import { User } from '../database/entities/user.entity.js';
import { RoleName, UserStatus } from '../database/enums.js';
import { toRegisterResponse } from './auth.mapper.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { RegisterResponseDto } from './dto/register-response.dto.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const email = registerDto.email.trim().toLowerCase();

    const emailTaken = await this.userRepository.exists({
      where: { email },
    });

    if (emailTaken) {
      throw new DomainException(
        'EMAIL_ALREADY_EXISTS',
        'El email ya está registrado.',
        HttpStatus.CONFLICT,
      );
    }

    const userRole = await this.roleRepository.findOne({
      where: { name: RoleName.USER },
    });

    if (!userRole) {
      throw new DomainException(
        'ROLE_NOT_CONFIGURED',
        'El rol USER no está configurado.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const passwordHash = await bcrypt.hash(registerDto.password, BCRYPT_ROUNDS);
    const user = this.userRepository.create({
      name: registerDto.name.trim(),
      email,
      passwordHash,
      roleId: userRole.id,
      role: userRole,
      status: UserStatus.ACTIVE,
    });

    const saved = await this.userRepository.save(user);
    return toRegisterResponse(saved);
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email.toLowerCase() },
      relations: { role: true },
    });

    if (!user) {
      throw new DomainException(
        'INVALID_CREDENTIALS',
        'Credenciales inválidas.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new DomainException(
        'USER_INACTIVE',
        'El usuario no está activo.',
        HttpStatus.FORBIDDEN,
      );
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new DomainException(
        'INVALID_CREDENTIALS',
        'Credenciales inválidas.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role.name,
    });

    return { accessToken };
  }
}
