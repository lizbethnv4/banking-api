import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountMovement } from '../database/entities/account-movement.entity.js';
import { Account } from '../database/entities/account.entity.js';
import { AccountStatus } from '../database/enums.js';
import { AccountsService } from './accounts.service.js';

describe('AccountsService findOptions', () => {
  let service: AccountsService;

  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    getMany: vi.fn(),
  };

  const accountRepository = {
    createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    queryBuilder.select.mockReturnThis();
    queryBuilder.where.mockReturnThis();
    queryBuilder.orderBy.mockReturnThis();
    accountRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(Account),
          useValue: accountRepository,
        },
        {
          provide: getRepositoryToken(AccountMovement),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(AccountsService);
  });

  it('returns active account options with balance as string', async () => {
    queryBuilder.getMany.mockResolvedValue([
      {
        id: 'account-1',
        accountNumber: '0010000001',
        holderName: 'John Doe',
        balance: '10000',
        currency: 'DOP',
        status: AccountStatus.ACTIVE,
      },
    ]);

    await expect(service.findOptions()).resolves.toEqual([
      {
        id: 'account-1',
        accountNumber: '0010000001',
        holderName: 'John Doe',
        balance: '10000.0000',
        currency: 'DOP',
        status: AccountStatus.ACTIVE,
      },
    ]);

    const [option] = await service.findOptions();
    expect(typeof option.balance).toBe('string');
  });

  it('selects only active accounts ordered by account number', async () => {
    queryBuilder.getMany.mockResolvedValue([]);

    await service.findOptions();

    expect(accountRepository.createQueryBuilder).toHaveBeenCalledWith(
      'account',
    );
    expect(queryBuilder.select).toHaveBeenCalledWith([
      'account.id',
      'account.accountNumber',
      'account.holderName',
      'account.balance',
      'account.currency',
      'account.status',
    ]);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'account.status = :status',
      { status: AccountStatus.ACTIVE },
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'account.accountNumber',
      'ASC',
    );
    expect(queryBuilder.leftJoin).not.toHaveBeenCalled();
    expect(queryBuilder.leftJoinAndSelect).not.toHaveBeenCalled();
    expect(queryBuilder.innerJoin).not.toHaveBeenCalled();
  });
});
