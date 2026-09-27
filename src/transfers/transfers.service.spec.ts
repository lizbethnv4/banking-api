import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DomainException } from '../common/errors/domain.exception.js';
import { Transfer } from '../database/entities/transfer.entity.js';
import { TransferStatus } from '../database/enums.js';
import { TransfersService } from './transfers.service.js';

describe('TransfersService', () => {
  let service: TransfersService;

  const transferRepository = {
    findOne: vi.fn(),
  };

  const dataSource = {
    createQueryRunner: vi.fn(),
  };

  const sourceAccountId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const destinationAccountId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransfersService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: getRepositoryToken(Transfer),
          useValue: transferRepository,
        },
      ],
    }).compile();

    service = module.get(TransfersService);
  });

  it('rejects an amount that is not greater than zero', async () => {
    await expect(
      service.create({
        sourceAccountId,
        destinationAccountId,
        amount: '0',
        idempotencyKey: 'idem-1',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'INVALID_AMOUNT',
        httpStatus: 400,
      } satisfies Partial<DomainException>),
    );

    expect(transferRepository.findOne).not.toHaveBeenCalled();
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('rejects a transfer to the same account', async () => {
    await expect(
      service.create({
        sourceAccountId,
        destinationAccountId: sourceAccountId.toUpperCase(),
        amount: '10.0000',
        idempotencyKey: 'idem-2',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'SAME_ACCOUNT_TRANSFER',
        httpStatus: 400,
      } satisfies Partial<DomainException>),
    );

    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('returns the original transfer when the idempotency key is repeated', async () => {
    const createdAt = new Date('2026-09-24T15:30:00.000Z');

    transferRepository.findOne.mockResolvedValue({
      id: 'transfer-1',
      reference: 'TRX-1',
      sourceAccountId,
      destinationAccountId,
      amount: '25',
      status: TransferStatus.COMPLETED,
      idempotencyKey: 'idem-3',
      failureCode: null,
      failureMessage: null,
      createdAt,
      completedAt: createdAt,
    });

    await expect(
      service.create({
        sourceAccountId,
        destinationAccountId,
        amount: '25.0000',
        idempotencyKey: 'idem-3',
      }),
    ).resolves.toEqual({
      id: 'transfer-1',
      reference: 'TRX-1',
      sourceAccountId,
      destinationAccountId,
      amount: '25.0000',
      status: TransferStatus.COMPLETED,
      idempotencyKey: 'idem-3',
      failureCode: null,
      failureMessage: null,
      createdAt,
      completedAt: createdAt,
    });

    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });
});
