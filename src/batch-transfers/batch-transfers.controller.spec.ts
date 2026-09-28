import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { BatchTransfersController } from './batch-transfers.controller.js';
import { BatchTransfersService } from './batch-transfers.service.js';

describe('BatchTransfersController', () => {
  let controller: BatchTransfersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatchTransfersController],
      providers: [
        {
          provide: BatchTransfersService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BatchTransfersController>(BatchTransfersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
