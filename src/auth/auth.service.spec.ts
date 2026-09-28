import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { DomainException } from '../common/errors/domain.exception.js';
import { Role } from '../database/entities/role.entity.js';
import { User } from '../database/entities/user.entity.js';
import { RoleName, UserStatus } from '../database/enums.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  const userRepository = {
    findOne: vi.fn(),
    exists: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };
  const roleRepository = {
    findOne: vi.fn(),
  };
  const jwtService = {
    signAsync: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: roleRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('returns an access token for an ACTIVE user with a valid password', async () => {
    const passwordHash = await bcrypt.hash('Admin123!', 4);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'admin@banking.local',
      passwordHash,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.ADMIN },
    });
    jwtService.signAsync.mockResolvedValue('signed-token');

    await expect(
      service.login({
        email: 'Admin@banking.local',
        password: 'Admin123!',
      }),
    ).resolves.toEqual({ accessToken: 'signed-token' });

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { email: 'admin@banking.local' },
      relations: { role: true },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'admin@banking.local',
      role: RoleName.ADMIN,
    });
  });

  it('rejects invalid credentials', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'nobody@banking.local',
        password: 'wrong',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'INVALID_CREDENTIALS',
        httpStatus: 401,
      } satisfies Partial<DomainException>),
    );
  });

  it('rejects an INACTIVE user', async () => {
    const passwordHash = await bcrypt.hash('Admin123!', 4);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'admin@banking.local',
      passwordHash,
      status: UserStatus.INACTIVE,
      role: { name: RoleName.ADMIN },
    });

    await expect(
      service.login({
        email: 'admin@banking.local',
        password: 'Admin123!',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'USER_INACTIVE',
        httpStatus: 403,
      } satisfies Partial<DomainException>),
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('registers an ACTIVE user with role USER', async () => {
    const userRole = { id: 'role-user', name: RoleName.USER };
    userRepository.exists.mockResolvedValue(false);
    roleRepository.findOne.mockResolvedValue(userRole);
    userRepository.create.mockImplementation((value: object) => value);
    userRepository.save.mockImplementation(async (value: object) => ({
      id: 'user-2',
      ...value,
    }));

    const result = await service.register({
      name: ' John Doe ',
      email: 'John@example.com',
      password: 'Password123!',
    });

    expect(result).toEqual({
      id: 'user-2',
      name: 'John Doe',
      email: 'john@example.com',
      role: RoleName.USER,
      status: UserStatus.ACTIVE,
    });
    expect(userRepository.exists).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    });
    expect(roleRepository.findOne).toHaveBeenCalledWith({
      where: { name: RoleName.USER },
    });
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com',
        roleId: 'role-user',
        status: UserStatus.ACTIVE,
      }),
    );
  });

  it('rejects a duplicated email', async () => {
    userRepository.exists.mockResolvedValue(true);

    await expect(
      service.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'EMAIL_ALREADY_EXISTS',
        httpStatus: 409,
      } satisfies Partial<DomainException>),
    );
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('stores a bcrypt hash instead of the plain password', async () => {
    const userRole = { id: 'role-user', name: RoleName.USER };
    userRepository.exists.mockResolvedValue(false);
    roleRepository.findOne.mockResolvedValue(userRole);
    userRepository.create.mockImplementation((value: object) => value);
    userRepository.save.mockImplementation(async (value: object) => ({
      id: 'user-2',
      ...value,
    }));

    await service.register({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
    });

    const created = userRepository.create.mock.calls[0][0] as {
      passwordHash: string;
    };

    expect(created.passwordHash).not.toBe('Password123!');
    await expect(
      bcrypt.compare('Password123!', created.passwordHash),
    ).resolves.toBe(true);
  });
});
