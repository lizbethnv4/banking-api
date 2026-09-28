import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: async () => ({ status: 'ok', database: 'up' }),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns health payload', async () => {
    await expect(controller.getHealth()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });
});
