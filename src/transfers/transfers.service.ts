import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Decimal } from 'decimal.js';
import { DataSource, Repository } from 'typeorm';

import { DomainException } from '../common/errors/domain.exception.js';
import { generateTransferReference } from '../common/utils/utils.js';
import { AccountMovement } from '../database/entities/account-movement.entity.js';
import { Account } from '../database/entities/account.entity.js';
import { Transfer } from '../database/entities/transfer.entity.js';
import {
    AccountStatus,
    MovementType,
    TransferStatus,
} from '../database/enums.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';

@Injectable()
export class TransfersService {
    constructor(
        private readonly dataSource: DataSource,

        @InjectRepository(Transfer)
        private readonly transferRepository: Repository<Transfer>,
    ) { }

    async create(createTransferDto: CreateTransferDto) {
        const amount = new Decimal(createTransferDto.amount);

        if (amount.lte(0)) {
            throw new DomainException(
                'INVALID_AMOUNT',
                'El monto debe ser mayor a 0',
                HttpStatus.BAD_REQUEST,
            );
        }

        if (
            createTransferDto.sourceAccountId.toLowerCase() ===
            createTransferDto.destinationAccountId.toLowerCase()
        ) {
            throw new DomainException(
                'SAME_ACCOUNT_TRANSFER',
                'La cuenta de origen y destino deben ser diferentes.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const existingTransfer = await this.transferRepository.findOne({
            where: {
                idempotencyKey: createTransferDto.idempotencyKey,
            },
        });

        if (existingTransfer) {
            const sameRequest =
                existingTransfer.sourceAccountId.toLowerCase() ===
                createTransferDto.sourceAccountId.toLowerCase() &&
                existingTransfer.destinationAccountId.toLowerCase() ===
                createTransferDto.destinationAccountId.toLowerCase() &&
                new Decimal(existingTransfer.amount).eq(createTransferDto.amount);

            if (!sameRequest) {
                throw new DomainException(
                    'IDEMPOTENCY_KEY_CONFLICT',
                    'La clave de idempotencia ya fue utilizada para otra transferencia.',
                    HttpStatus.CONFLICT,
                );
            }

            return existingTransfer;
        }

        return this.executeWithDeadlockRetry(createTransferDto, amount);
    }


    private async executeWithDeadlockRetry(
        createTransferDto: CreateTransferDto,
        amount: Decimal,
    ) {
        const delays = [50, 100, 200];

        for (let attempt = 0; attempt <= delays.length; attempt++) {
            try {
                return await this.executeTransfer(createTransferDto, amount);
            } catch (error: unknown) {
                if (!this.isDeadlockError(error)) {
                    throw error;
                }

                if (attempt === delays.length) {
                    throw new DomainException(
                        'DEADLOCK_RETRY_EXHAUSTED',
                        'No se pudo completar la transferencia debido a concurrencia.',
                        HttpStatus.CONFLICT,
                    );
                }

                await this.sleep(delays[attempt]);
            }
        }

        throw new DomainException(
            'DEADLOCK_RETRY_EXHAUSTED',
            'No se pudo completar la transferencia debido a concurrencia.',
            HttpStatus.CONFLICT,
        );
    }

    private async executeTransfer(
        createTransferDto: CreateTransferDto,
        amount: Decimal,
    ) {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {

            const accounts: Account[] = await queryRunner.query(
                `
                SELECT id, balance, status
                FROM accounts WITH (UPDLOCK, ROWLOCK, HOLDLOCK)
                WHERE id IN (@0, @1)
                ORDER BY id;
                `,
                [
                    createTransferDto.sourceAccountId,
                    createTransferDto.destinationAccountId,
                ],
            );

            const sourceAccount = accounts.find(
                (account) =>
                    account.id.toLowerCase() ===
                    createTransferDto.sourceAccountId.toLowerCase(),
            );

            const destinationAccount = accounts.find(
                (account) =>
                    account.id.toLowerCase() ===
                    createTransferDto.destinationAccountId.toLowerCase(),
            );

            if (!sourceAccount) {
                throw new DomainException(
                    'SOURCE_ACCOUNT_NOT_FOUND',
                    'La cuenta de origen no existe',
                    HttpStatus.NOT_FOUND,
                );
            }

            if (!destinationAccount) {
                throw new DomainException(
                    'DESTINATION_ACCOUNT_NOT_FOUND',
                    'La cuenta de destino no existe',
                    HttpStatus.NOT_FOUND,
                );
            }

            if (sourceAccount.status !== AccountStatus.ACTIVE) {
                throw new DomainException(
                    'SOURCE_ACCOUNT_NOT_ACTIVE',
                    'La cuenta de origen no está activa',
                    HttpStatus.BAD_REQUEST,
                );
            }

            if (destinationAccount.status !== AccountStatus.ACTIVE) {
                throw new DomainException(
                    'DESTINATION_ACCOUNT_NOT_ACTIVE',
                    'La cuenta de destino no está activa',
                    HttpStatus.BAD_REQUEST,
                );
            }

            const sourceBalance = new Decimal(sourceAccount.balance);
            const destinationBalance = new Decimal(destinationAccount.balance);

            if (sourceBalance.lt(amount)) {
                throw new DomainException(
                    'INSUFFICIENT_BALANCE',
                    'El saldo de la cuenta de origen no es suficiente',
                    HttpStatus.BAD_REQUEST,
                );
            }

            const sourceBalanceAfter = sourceBalance.minus(amount);
            const destinationBalanceAfter = destinationBalance.plus(amount);

            const transferRepository =
                queryRunner.manager.getRepository(Transfer);

            const movementRepository =
                queryRunner.manager.getRepository(AccountMovement);

            const transfer = transferRepository.create({
                reference: generateTransferReference(),
                sourceAccountId: sourceAccount.id,
                destinationAccountId: destinationAccount.id,
                amount: amount.toFixed(4),
                status: TransferStatus.COMPLETED,
                idempotencyKey: createTransferDto.idempotencyKey,
                completedAt: new Date(),
            });

            const createdTransfer =
                await transferRepository.save(transfer);

            await queryRunner.manager.update(
                Account,
                { id: sourceAccount.id },
                {
                    balance: sourceBalanceAfter.toFixed(4),
                },
            );

            await queryRunner.manager.update(
                Account,
                { id: destinationAccount.id },
                {
                    balance: destinationBalanceAfter.toFixed(4),
                },
            );

            const debitMovement = movementRepository.create({
                accountId: sourceAccount.id,
                transferId: createdTransfer.id,
                type: MovementType.DEBIT,
                amount: amount.toFixed(4),
                balanceBefore: sourceBalance.toFixed(4),
                balanceAfter: sourceBalanceAfter.toFixed(4),
                description:
                    `Transferencia de fondos de ${sourceAccount.id} ` +
                    `a ${destinationAccount.id}`,
            });

            const creditMovement = movementRepository.create({
                accountId: destinationAccount.id,
                transferId: createdTransfer.id,
                type: MovementType.CREDIT,
                amount: amount.toFixed(4),
                balanceBefore: destinationBalance.toFixed(4),
                balanceAfter: destinationBalanceAfter.toFixed(4),
                description:
                    `Transferencia de fondos de ${sourceAccount.id} ` +
                    `a ${destinationAccount.id}`,
            });

            await movementRepository.save([
                debitMovement,
                creditMovement,
            ]);

            await queryRunner.commitTransaction();

            return createdTransfer;
        } catch (error: unknown) {
            await queryRunner.rollbackTransaction();

            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    private isDeadlockError(error: unknown): boolean {
        if (typeof error !== 'object' || error === null) {
            return false;
        }

        const dbError = error as {
            number?: number;
            originalError?: {
                info?: {
                    number?: number;
                };
            };
        };

        return (
            dbError.number === 1205 ||
            dbError.originalError?.info?.number === 1205
        );
    }

    private sleep(milliseconds: number): Promise<void> {
        return new Promise((resolve) =>
            setTimeout(resolve, milliseconds),
        );
    }
}