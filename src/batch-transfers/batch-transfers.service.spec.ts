import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountsService } from '../accounts/accounts.service.js';
import { BatchProcess } from '../database/entities/batch-process.entity.js';
import { BatchTransferItem } from '../database/entities/batch-transfer-item.entity.js';
import { TransfersService } from '../transfers/transfers.service.js';
import { BatchTransfersService } from './batch-transfers.service.js';

describe('BatchTransfersService', () => {
  let service: BatchTransfersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchTransfersService,
        {
          provide: getRepositoryToken(BatchProcess),
          useValue: {},
        },
        {
          provide: getRepositoryToken(BatchTransferItem),
          useValue: {},
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

    service = module.get<BatchTransfersService>(BatchTransfersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
