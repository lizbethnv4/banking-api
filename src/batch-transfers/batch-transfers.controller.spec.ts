import { Test, TestingModule } from '@nestjs/testing';
import { BatchTransfersController } from './batch-transfers.controller.js';

describe('BatchTransfersController', () => {
  let controller: BatchTransfersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatchTransfersController],
    }).compile();

    controller = module.get<BatchTransfersController>(BatchTransfersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
