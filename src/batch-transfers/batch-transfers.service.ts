import { Decimal } from 'decimal.js';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'csv-parse/sync';
import { Repository } from 'typeorm';
import { DomainException } from '../common/errors/domain.exception.js';
import { BatchProcess } from '../database/entities/batch-process.entity.js';
import { BatchTransferItem } from '../database/entities/batch-transfer-item.entity.js';
import { BatchItemStatus, BatchStatus } from '../database/enums.js';
import { toBatchItemsResponse, toBatchProcessOptionResponse, toBatchProcessResponse, toCreateBatchResponse } from './batch-transfers.mapper.js';
import { CreateBatchResponseDto } from './dto/create-batch-response.dto.js';
import { TransfersService } from '../transfers/transfers.service.js';
import { AccountsService } from '../accounts/accounts.service.js';
import { BatchProcessOptionResponseDto } from './dto/batch-process-option-response.dto.js';
import { BatchProcessResponseDto } from './dto/batch-process-response.dto.js';
import { GetBatchItemsQueryDto } from './dto/get-batch-items-query.dto.js';
import { BatchItemsResponseDto } from './dto/batch-items-response.dto.js';
import { Account } from '../database/entities/account.entity.js';

type CsvTransferRow = {
    sourceAccountNumber?: string;
    destinationAccountNumber?: string;
    amount?: string;
};

@Injectable()
export class BatchTransfersService {
    constructor(
        @InjectRepository(BatchProcess)
        private readonly batchProcessRepository: Repository<BatchProcess>,

        @InjectRepository(BatchTransferItem)
        private readonly batchItemRepository: Repository<BatchTransferItem>,

        private readonly transfersService: TransfersService,
        private readonly accountsService: AccountsService,
    ) { }

    private readonly PROCESSING_BATCH_SIZE = 500;
    private readonly MAX_ITEM_ATTEMPTS = 3;
    private readonly CONCURRENCY_LIMIT = 5;

    private perf = {
        items: 0,
        processingSaveMs: 0,
        accountLookupMs: 0,
        transferMs: 0,
        resultSaveMs: 0,
    };

    async createBatch(
        file: Express.Multer.File,
    ): Promise<CreateBatchResponseDto> {
        if (!file) {
            throw new DomainException(
                'VALIDATION_ERROR',
                'El archivo CSV es obligatorio.',
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!file.originalname.toLowerCase().endsWith('.csv')) {
            throw new DomainException(
                'VALIDATION_ERROR',
                'Solo se permiten archivos CSV.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const rows = this.parseCsv(file);

        const now = new Date();

        const batch = this.batchProcessRepository.create({
            originalFileName: file.originalname,
            status: BatchStatus.PENDING,
            totalItems: rows.length,
            processedItems: 0,
            successfulItems: 0,
            failedItems: 0,
            progressPercentage: '0.00',
            createdAt: now,
            startedAt: null,
            completedAt: null,
            failureMessage: null,
        });

        const createdBatch = await this.batchProcessRepository.save(batch);

        const items = rows.map((row, index) =>
            this.batchItemRepository.create({
                batchProcessId: createdBatch.id,

                // +2 porque la línea 1 del CSV contiene los encabezados.
                rowNumber: index + 2,

                sourceAccountNumber: row.sourceAccountNumber!,
                destinationAccountNumber: row.destinationAccountNumber!,
                amount: row.amount!,

                idempotencyKey: `${createdBatch.id}:${index + 2}`,

                status: BatchItemStatus.PENDING,
                attemptCount: 0,
                transferId: null,
                errorCode: null,
                errorMessage: null,
                processedAt: null,
            }),
        );

        await this.batchItemRepository.save(items, {
            chunk: 100,
        });

        void this.processBatch(createdBatch.id).catch((error: unknown) => {
            console.error(
                `Unexpected error processing batch ${createdBatch.id}`,
                error,
            );
        });

        return toCreateBatchResponse(createdBatch);
    }

    private parseCsv(
        file: Express.Multer.File,
    ): CsvTransferRow[] {
        let rows: CsvTransferRow[];

        try {
            rows = parse(file.buffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            }) as CsvTransferRow[];
        } catch {
            throw new DomainException(
                'VALIDATION_ERROR',
                'Invalid CSV file',
                HttpStatus.BAD_REQUEST,
            )
        }

        if (rows.length === 0) {
            throw new DomainException(
                'VALIDATION_ERROR',
                'El CSV debe contener al menos una transferencia.',
                HttpStatus.BAD_REQUEST,
            );
        }

        if (rows.length > 10_000) {
            throw new DomainException(
                'VALIDATION_ERROR',
                'El CSV no puede contener más de 10,000 transferencias.',
                HttpStatus.BAD_REQUEST,
                { maxRows: 10_000, received: rows.length },
            )
        }

        for (const [index, row] of rows.entries()) {
            const rowNumber = index + 2;

            if (
                !row.sourceAccountNumber ||
                !row.destinationAccountNumber ||
                !row.amount
            ) {
                throw new DomainException(
                    'VALIDATION_ERROR',
                    'El CSV debe contener al menos una transferencia.',
                    HttpStatus.BAD_REQUEST,
                );
            }

            if (
                row.sourceAccountNumber ===
                row.destinationAccountNumber
            ) {
                throw new DomainException(
                    'VALIDATION_ERROR',
                    'La cuenta de origen y destino no pueden ser iguales.',
                    HttpStatus.BAD_REQUEST,
                );
            }

            if (!/^\d+(\.\d{1,4})?$/.test(row.amount)) {
                throw new DomainException(
                    'VALIDATION_ERROR',
                    'El monto debe ser un número válido.',
                    HttpStatus.BAD_REQUEST,
                );
            }

            const amount = new Decimal(row.amount);

            if (amount.lessThanOrEqualTo(0)) {
                throw new DomainException(
                    'VALIDATION_ERROR',
                    'El monto debe ser mayor a cero.',
                    HttpStatus.BAD_REQUEST,
                );
            }
        }

        return rows;
    }

    async processBatch(batchId: string): Promise<void> {
        const batch = await this.batchProcessRepository.findOne({
            where: { id: batchId },
        });

        if (!batch) {
            return;
        }

        // Reiniciar métricas para este batch
        this.perf = {
            items: 0,
            processingSaveMs: 0,
            accountLookupMs: 0,
            transferMs: 0,
            resultSaveMs: 0,
        };

        const batchPerformanceStart = performance.now();

        batch.status = BatchStatus.PROCESSING;
        batch.startedAt = new Date();

        await this.batchProcessRepository.save(batch);

        try {
            while (true) {
                const items = await this.batchItemRepository.find({
                    where: {
                        batchProcessId: batchId,
                        status: BatchItemStatus.PENDING,
                    },
                    order: {
                        rowNumber: 'ASC',
                    },
                    take: this.PROCESSING_BATCH_SIZE,
                });

                if (items.length === 0) {
                    break;
                }

                const accountsMap =
                    await this.loadAccountsMap(items);

                for (
                    let i = 0;
                    i < items.length;
                    i += this.CONCURRENCY_LIMIT
                ) {
                    const group = items.slice(
                        i,
                        i + this.CONCURRENCY_LIMIT,
                    );

                    const groupIds = group.map((item) => item.id);

                    const processingStart = performance.now();

                    await this.batchItemRepository
                        .createQueryBuilder()
                        .update(BatchTransferItem)
                        .set({
                            status: BatchItemStatus.PROCESSING,
                            attemptCount: () => '"attempt_count" + 1',
                        })
                        .whereInIds(groupIds)
                        .execute();

                    const processingMs =
                        performance.now() - processingStart;

                    // Lo repartimos entre los items únicamente
                    // para mantener útil nuestro profiler.
                    this.perf.processingSaveMs += processingMs;

                    // Sincronizamos los objetos en memoria.
                    for (const item of group) {
                        item.status = BatchItemStatus.PROCESSING;
                        item.attemptCount += 1;
                    }

                    await Promise.all(
                        group.map((item) =>
                            this.processItem(item, accountsMap),
                        ),
                    );
                }

                await this.updateProgress(batchId);
            }

            const totalBatchMs =
                performance.now() - batchPerformanceStart;

            console.log('===== BATCH PERFORMANCE =====');
            console.log({
                items: this.perf.items,

                totalBatchSeconds:
                    (totalBatchMs / 1000).toFixed(2),

                avgProcessingSaveMs:
                    this.perf.items > 0
                        ? (
                            this.perf.processingSaveMs /
                            this.perf.items
                        ).toFixed(2)
                        : '0',

                avgAccountLookupMs:
                    this.perf.items > 0
                        ? (
                            this.perf.accountLookupMs /
                            this.perf.items
                        ).toFixed(2)
                        : '0',

                avgTransferMs:
                    this.perf.items > 0
                        ? (
                            this.perf.transferMs /
                            this.perf.items
                        ).toFixed(2)
                        : '0',

                avgResultSaveMs:
                    this.perf.items > 0
                        ? (
                            this.perf.resultSaveMs /
                            this.perf.items
                        ).toFixed(2)
                        : '0',
            });
            console.log('=============================');

            await this.finishBatch(batchId);
        } catch (error) {
            await this.failBatch(batchId, error);
        }
    }

    private async processItem(
        item: BatchTransferItem,
        accountsMap: Map<string, Account>,
    ): Promise<void> {
        // Contamos el intento desde el principio.
        this.perf.items++;

        try {
            // ==========================================
            // Medir búsqueda de cuentas
            // ==========================================

            const accountLookupStart = performance.now();

            const source = accountsMap.get(item.sourceAccountNumber);
            const destination = accountsMap.get(item.destinationAccountNumber);

            this.perf.accountLookupMs +=
                performance.now() - accountLookupStart;

            if (!source) {
                throw new DomainException(
                    'ACCOUNT_NOT_FOUND',
                    'Cuenta de origen no encontrada',
                    HttpStatus.NOT_FOUND,
                );
            }

            if (!destination) {
                throw new DomainException(
                    'ACCOUNT_NOT_FOUND',
                    'Cuenta de destino no encontrada',
                    HttpStatus.NOT_FOUND,
                );
            }

            // ==========================================
            // Medir transferencia
            // ==========================================

            const transferStart = performance.now();

            const transfer = await this.transfersService.create({
                sourceAccountId: source.id,
                destinationAccountId: destination.id,
                amount: item.amount,
                idempotencyKey: item.idempotencyKey,
            });

            this.perf.transferMs +=
                performance.now() - transferStart;

            // ==========================================
            // Guardar resultado
            // ==========================================

            item.status = BatchItemStatus.SUCCEEDED;
            item.transferId = transfer.id;
            item.errorCode = null;
            item.errorMessage = null;
            item.processedAt = new Date();

            const resultSaveStart = performance.now();

            await this.batchItemRepository.save(item);

            this.perf.resultSaveMs +=
                performance.now() - resultSaveStart;

        } catch (error) {
            if (error instanceof DomainException) {
                item.status = BatchItemStatus.FAILED;
                item.errorCode = error.code;
                item.errorMessage = error.message;
                item.processedAt = new Date();

                const resultSaveStart = performance.now();

                await this.batchItemRepository.save(item);

                this.perf.resultSaveMs +=
                    performance.now() - resultSaveStart;

                return;
            }

            if (item.attemptCount < this.MAX_ITEM_ATTEMPTS) {
                item.status = BatchItemStatus.RETRYING;
                item.errorCode = 'TECHNICAL_ERROR';
                item.errorMessage =
                    error instanceof Error
                        ? error.message
                        : 'Unexpected technical error';

                await this.batchItemRepository.save(item);

                await this.delay(100 * item.attemptCount);

                item.status = BatchItemStatus.PENDING;

                await this.batchItemRepository.save(item);

                return;
            }

            item.status = BatchItemStatus.FAILED;
            item.errorCode = 'TECHNICAL_ERROR';
            item.errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unexpected technical error';

            item.processedAt = new Date();

            const resultSaveStart = performance.now();

            await this.batchItemRepository.save(item);

            this.perf.resultSaveMs +=
                performance.now() - resultSaveStart;
        }
    }

    private delay(milliseconds: number): Promise<void> {
        return new Promise((resolve) =>
            setTimeout(resolve, milliseconds),
        );
    }

    private async updateProgress(batchId: string): Promise<void> {
        const batch = await this.batchProcessRepository.findOne({
            where: { id: batchId },
        });

        if (!batch) {
            return;
        }

        const successfulItems = await this.batchItemRepository.count({
            where: {
                batchProcessId: batchId,
                status: BatchItemStatus.SUCCEEDED,
            },
        });

        const failedItems = await this.batchItemRepository.count({
            where: {
                batchProcessId: batchId,
                status: BatchItemStatus.FAILED,
            },
        });

        const processedItems = successfulItems + failedItems;

        const progressPercentage =
            batch.totalItems === 0
                ? 0
                : (processedItems / batch.totalItems) * 100;

        batch.processedItems = processedItems;
        batch.successfulItems = successfulItems;
        batch.failedItems = failedItems;
        batch.progressPercentage = progressPercentage.toFixed(2);

        await this.batchProcessRepository.save(batch);
    }

    private async finishBatch(batchId: string): Promise<void> {
        await this.updateProgress(batchId);

        const batch = await this.batchProcessRepository.findOne({
            where: { id: batchId },
        });

        if (!batch) {
            return;
        }

        batch.status =
            batch.failedItems > 0
                ? BatchStatus.COMPLETED_WITH_ERRORS
                : BatchStatus.COMPLETED;

        batch.progressPercentage = '100.00';
        batch.completedAt = new Date();

        await this.batchProcessRepository.save(batch);
    }
    private async failBatch(
        batchId: string,
        error: unknown,
    ): Promise<void> {
        const batch = await this.batchProcessRepository.findOne({
            where: { id: batchId },
        });

        if (!batch) {
            return;
        }

        batch.status = BatchStatus.FAILED;

        batch.failureMessage =
            error instanceof Error
                ? error.message.slice(0, 500)
                : 'Unexpected batch processing error';

        batch.completedAt = new Date();

        await this.batchProcessRepository.save(batch);
    }

    async findOptions(): Promise<BatchProcessOptionResponseDto[]> {
        const batches = await this.batchProcessRepository
            .createQueryBuilder('batch')
            .select([
                'batch.id',
                'batch.originalFileName',
                'batch.status',
                'batch.totalItems',
                'batch.processedItems',
                'batch.successfulItems',
                'batch.failedItems',
                'batch.createdAt',
            ])
            .orderBy('batch.createdAt', 'DESC')
            .getMany();

        return batches.map(toBatchProcessOptionResponse);
    }

    async findById(
        batchId: string,
    ): Promise<BatchProcessResponseDto> {
        const batch = await this.batchProcessRepository.findOne({
            where: { id: batchId },
        });

        if (!batch) {
            throw new DomainException(
                'BATCH_NOT_FOUND',
                'Batch process not found',
                404,
            );
        }

        return toBatchProcessResponse(batch);
    }

    async getItems(
        batchId: string,
        query: GetBatchItemsQueryDto,
    ): Promise<BatchItemsResponseDto> {
        const batchExists = await this.batchProcessRepository.exists({
            where: { id: batchId },
        });

        if (!batchExists) {
            throw new DomainException(
                'BATCH_NOT_FOUND',
                'Batch process not found',
                404,
            );
        }

        const { page = 1, pageSize = 20, status } = query;

        const qb = this.batchItemRepository
            .createQueryBuilder('item')
            .where('item.batchProcessId = :batchId', {
                batchId,
            });

        if (status) {
            qb.andWhere('item.status = :status', {
                status,
            });
        }

        qb.orderBy('item.rowNumber', 'ASC')
            .skip((page - 1) * pageSize)
            .take(pageSize);

        const [items, total] = await qb.getManyAndCount();

        return toBatchItemsResponse(
            items,
            page,
            pageSize,
            total,
        );
    }

    private async loadAccountsMap(
        items: BatchTransferItem[],
    ): Promise<Map<string, Account>> {
        const accountNumbers = [
            ...new Set(
                items.flatMap((item) => [
                    item.sourceAccountNumber,
                    item.destinationAccountNumber,
                ]),
            ),
        ];

        const accounts =
            await this.accountsService.findAccountsByNumbers(
                accountNumbers,
            );

        return new Map(
            accounts.map((account) => [
                account.accountNumber,
                account,
            ]),
        );
    }
}
