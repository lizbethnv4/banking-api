import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DomainException } from '../common/errors/domain.exception.js';
import { Role } from '../database/entities/role.entity.js';
import { User } from '../database/entities/user.entity.js';
import { RoleName, UserStatus } from '../database/enums.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  const userRepository = {
    findOne: vi.fn(),
    count: vi.fn(),
    save: vi.fn(),
  };
  const roleRepository = {
    findOne: vi.fn(),
  };

  const userRole = { id: 'role-user', name: RoleName.USER };
  const adminRole = { id: 'role-admin', name: RoleName.ADMIN };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: roleRepository,
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('updates a user role', async () => {
    const user = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      status: UserStatus.ACTIVE,
      roleId: userRole.id,
      role: userRole,
    };
    userRepository.findOne.mockResolvedValue(user);
    roleRepository.findOne.mockResolvedValue(adminRole);
    userRepository.save.mockImplementation(async (value: object) => value);

    await expect(
      service.updateRole('user-1', { role: RoleName.ADMIN }),
    ).resolves.toEqual({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: RoleName.ADMIN,
      status: UserStatus.ACTIVE,
    });
    expect(userRepository.save).toHaveBeenCalled();
  });

  it('rejects when the user does not exist', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateRole('missing', { role: RoleName.ADMIN }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'USER_NOT_FOUND',
        httpStatus: 404,
      } satisfies Partial<DomainException>),
    );
  });

  it('rejects demoting the last ADMIN', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'admin-1',
      name: 'Administrator',
      email: 'admin@banking.local',
      status: UserStatus.ACTIVE,
      roleId: adminRole.id,
      role: adminRole,
    });
    roleRepository.findOne.mockResolvedValue(userRole);
    userRepository.count.mockResolvedValue(1);

    await expect(
      service.updateRole('admin-1', { role: RoleName.USER }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'LAST_ADMIN',
        httpStatus: 409,
      } satisfies Partial<DomainException>),
    );
    expect(userRepository.save).not.toHaveBeenCalled();
  });
});
