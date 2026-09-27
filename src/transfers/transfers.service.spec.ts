import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { DomainException } from '../common/errors/domain.exception.js';
import { TransferStatus } from '../database/enums.js';
import { TransfersService } from './transfers.service.js';

describe('TransfersService', () => {
  let service: TransfersService;

  const queryRunner = {
    connect: vi.fn(),
    release: vi.fn(),
    query: vi.fn(),
  };

  const dataSource = {
    createQueryRunner: vi.fn(() => queryRunner),
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

  it('returns the original transfer when the procedure reports a repeated key', async () => {
    const createdAt = new Date('2026-09-24T15:30:00.000Z');

    queryRunner.query.mockResolvedValue([
      {
        result_code: 'OK',
        id: 'transfer-1',
        reference: 'TRX-1',
        source_account_id: sourceAccountId,
        destination_account_id: destinationAccountId,
        amount: '25.0000',
        status: TransferStatus.COMPLETED,
        idempotency_key: 'idem-3',
        failure_code: null,
        failure_message: null,
        created_at: createdAt,
        completed_at: createdAt,
      },
    ]);

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

    expect(queryRunner.query).toHaveBeenCalledOnce();
    expect(queryRunner.release).toHaveBeenCalledOnce();
  });

  it('maps an insufficient balance result from the procedure', async () => {
    queryRunner.query.mockResolvedValue([
      {
        result_code: 'INSUFFICIENT_BALANCE',
        id: null,
        reference: null,
        source_account_id: null,
        destination_account_id: null,
        amount: null,
        status: null,
        idempotency_key: null,
        failure_code: null,
        failure_message: null,
        created_at: null,
        completed_at: null,
      },
    ]);

    await expect(
      service.create({
        sourceAccountId,
        destinationAccountId,
        amount: '10.0000',
        idempotencyKey: 'idem-4',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'INSUFFICIENT_BALANCE',
        httpStatus: 400,
      } satisfies Partial<DomainException>),
    );

    expect(queryRunner.release).toHaveBeenCalledOnce();
  });
});
