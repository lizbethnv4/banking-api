import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountsService } from '../accounts/accounts.service.js';
import { BatchProcess } from '../database/entities/batch-process.entity.js';
import { BatchTransferItem } from '../database/entities/batch-transfer-item.entity.js';
import { BatchStatus } from '../database/enums.js';
import { TransfersService } from '../transfers/transfers.service.js';
import { BatchTransfersService } from './batch-transfers.service.js';

describe('BatchTransfersService findOptions', () => {
  let service: BatchTransfersService;

  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    getMany: vi.fn(),
  };

  const batchProcessRepository = {
    createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
  };

  const batchItemRepository = {
    createQueryBuilder: vi.fn(),
    find: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    queryBuilder.select.mockReturnThis();
    queryBuilder.orderBy.mockReturnThis();
    batchProcessRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchTransfersService,
        {
          provide: getRepositoryToken(BatchProcess),
          useValue: batchProcessRepository,
        },
        {
          provide: getRepositoryToken(BatchTransferItem),
          useValue: batchItemRepository,
        },
        {
          provide: TransfersService,
          useValue: {},
        },
        {
          provide: AccountsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(BatchTransfersService);
  });

  it('returns batch process options', async () => {
    const older = new Date('2026-09-01T12:00:00.000Z');
    const newer = new Date('2026-09-24T15:30:00.000Z');

    queryBuilder.getMany.mockResolvedValue([
      {
        id: 'batch-new',
        originalFileName: 'transfers-10000.csv',
        status: BatchStatus.COMPLETED,
        totalItems: 10000,
        processedItems: 10000,
        successfulItems: 9980,
        failedItems: 20,
        createdAt: newer,
      },
      {
        id: 'batch-old',
        originalFileName: 'transfers-old.csv',
        status: BatchStatus.PENDING,
        totalItems: 10,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        createdAt: older,
      },
    ]);

    await expect(service.findOptions()).resolves.toEqual([
      {
        id: 'batch-new',
        originalFileName: 'transfers-10000.csv',
        status: BatchStatus.COMPLETED,
        totalItems: 10000,
        processedItems: 10000,
        successfulItems: 9980,
        failedItems: 20,
        createdAt: newer,
      },
      {
        id: 'batch-old',
        originalFileName: 'transfers-old.csv',
        status: BatchStatus.PENDING,
        totalItems: 10,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        createdAt: older,
      },
    ]);
  });

  it('orders by createdAt DESC and does not load batch items', async () => {
    queryBuilder.getMany.mockResolvedValue([]);

    await service.findOptions();

    expect(batchProcessRepository.createQueryBuilder).toHaveBeenCalledWith(
      'batch',
    );
    expect(queryBuilder.select).toHaveBeenCalledWith([
      'batch.id',
      'batch.originalFileName',
      'batch.status',
      'batch.totalItems',
      'batch.processedItems',
      'batch.successfulItems',
      'batch.failedItems',
      'batch.createdAt',
    ]);
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'batch.createdAt',
      'DESC',
    );
    expect(queryBuilder.leftJoin).not.toHaveBeenCalled();
    expect(queryBuilder.leftJoinAndSelect).not.toHaveBeenCalled();
    expect(queryBuilder.innerJoin).not.toHaveBeenCalled();
    expect(batchItemRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(batchItemRepository.find).not.toHaveBeenCalled();
  });
});
