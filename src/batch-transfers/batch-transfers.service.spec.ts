import { Test, TestingModule } from '@nestjs/testing';
import { BatchTransfersService } from './batch-transfers.service.js';

describe('BatchTransfersService', () => {
  let service: BatchTransfersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BatchTransfersService],
    }).compile();

    service = module.get<BatchTransfersService>(BatchTransfersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
