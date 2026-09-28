import { HttpStatus, Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { DataSource } from 'typeorm';

import { DomainException } from '../common/errors/domain.exception.js';
import { generateTransferReference } from '../common/utils/utils.js';
import { Transfer } from '../database/entities/transfer.entity.js';
import { TransferStatus } from '../database/enums.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { TransferResponseDto } from './dto/transfer-response.dto.js';
import { toTransferResponse } from './transfers.mapper.js';

type ExecuteTransferRow = {
    result_code: string;
    id: string | null;
    reference: string | null;
    source_account_id: string | null;
    destination_account_id: string | null;
    amount: string | number | null;
    status: TransferStatus | null;
    idempotency_key: string | null;
    failure_code: string | null;
    failure_message: string | null;
    created_at: Date | null;
    completed_at: Date | null;
};

const PROCEDURE_ERRORS: Record<
    string,
    { message: string; httpStatus: number }
> = {
    INVALID_AMOUNT: {
        message: 'El monto debe ser mayor a 0',
        httpStatus: HttpStatus.BAD_REQUEST,
    },
    SAME_ACCOUNT_TRANSFER: {
        message: 'La cuenta de origen y destino deben ser diferentes.',
        httpStatus: HttpStatus.BAD_REQUEST,
    },
    SOURCE_ACCOUNT_NOT_FOUND: {
        message: 'La cuenta de origen no existe',
        httpStatus: HttpStatus.NOT_FOUND,
    },
    DESTINATION_ACCOUNT_NOT_FOUND: {
        message: 'La cuenta de destino no existe',
        httpStatus: HttpStatus.NOT_FOUND,
    },
    SOURCE_ACCOUNT_NOT_ACTIVE: {
        message: 'La cuenta de origen no está activa',
        httpStatus: HttpStatus.BAD_REQUEST,
    },
    DESTINATION_ACCOUNT_NOT_ACTIVE: {
        message: 'La cuenta de destino no está activa',
        httpStatus: HttpStatus.BAD_REQUEST,
    },
    INSUFFICIENT_BALANCE: {
        message: 'El saldo de la cuenta de origen no es suficiente',
        httpStatus: HttpStatus.BAD_REQUEST,
    },
    IDEMPOTENCY_KEY_CONFLICT: {
        message:
            'La clave de idempotencia ya fue utilizada para otra transferencia.',
        httpStatus: HttpStatus.CONFLICT,
    },
};

@Injectable()
export class TransfersService {
    constructor(private readonly dataSource: DataSource) { }

    async create(
        createTransferDto: CreateTransferDto,
    ): Promise<TransferResponseDto> {
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

        const createdTransfer = await this.executeWithDeadlockRetry(
            createTransferDto,
            amount,
        );

        return toTransferResponse(createdTransfer);
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
    ): Promise<Transfer> {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();

        try {
            const rows: ExecuteTransferRow[] = await queryRunner.query(
                `
                EXEC dbo.usp_execute_transfer
                    @0,
                    @1,
                    @2,
                    @3,
                    @4;
                `,
                [
                    createTransferDto.sourceAccountId,
                    createTransferDto.destinationAccountId,
                    amount.toFixed(4),
                    createTransferDto.idempotencyKey,
                    generateTransferReference(),
                ],
            );

            return this.toTransferFromProcedure(rows[0]);
        } finally {
            await queryRunner.release();
        }
    }

    private toTransferFromProcedure(row: ExecuteTransferRow | undefined): Transfer {
        if (!row) {
            throw new DomainException(
                'INTERNAL_ERROR',
                'La transferencia no devolvió un resultado.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        if (row.result_code !== 'OK') {
            const procedureError = PROCEDURE_ERRORS[row.result_code];

            throw new DomainException(
                row.result_code,
                procedureError?.message ??
                    'No se pudo completar la transferencia.',
                procedureError?.httpStatus ?? HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        return {
            id: row.id ?? '',
            reference: row.reference ?? '',
            sourceAccountId: row.source_account_id ?? '',
            destinationAccountId: row.destination_account_id ?? '',
            amount: String(row.amount),
            status: row.status ?? TransferStatus.COMPLETED,
            idempotencyKey: row.idempotency_key ?? '',
            failureCode: row.failure_code,
            failureMessage: row.failure_message,
            createdAt: row.created_at ?? new Date(),
            completedAt: row.completed_at,
        } as Transfer;
    }

    private isDeadlockError(error: unknown): boolean {
        if (typeof error !== 'object' || error === null) {
            return false;
        }

        const dbError = error as {
            number?: number;
            driverError?: {
                number?: number;
            };
            originalError?: {
                info?: {
                    number?: number;
                };
            };
        };

        return (
            dbError.number === 1205 ||
            dbError.driverError?.number === 1205 ||
            dbError.originalError?.info?.number === 1205
        );
    }

    private sleep(milliseconds: number): Promise<void> {
        return new Promise((resolve) =>
            setTimeout(resolve, milliseconds),
        );
    }
}