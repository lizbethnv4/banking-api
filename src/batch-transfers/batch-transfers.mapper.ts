import { BatchProcess } from '../database/entities/batch-process.entity.js';

import { CreateBatchResponseDto } from './dto/create-batch-response.dto.js';
import { BatchTransferItem } from '../database/entities/batch-transfer-item.entity.js';
import { BatchProcessOptionResponseDto } from './dto/batch-process-option-response.dto.js';
import { BatchProcessResponseDto } from './dto/batch-process-response.dto.js';
import { formatMoneyString } from '../common/utils/utils.js';
import { BatchItemsResponseDto } from './dto/batch-items-response.dto.js';

export function toCreateBatchResponse(
  batch: BatchProcess,
): CreateBatchResponseDto {
  return {
    id: batch.id,
    originalFileName: batch.originalFileName,
    status: batch.status,
    totalItems: batch.totalItems,
    processedItems: batch.processedItems,
    successfulItems: batch.successfulItems,
    failedItems: batch.failedItems,
    progressPercentage: batch.progressPercentage,
    createdAt: batch.createdAt,
  };
}

export function toBatchProcessOptionResponse(
  batch: BatchProcess,
): BatchProcessOptionResponseDto {
  return {
    id: batch.id,
    originalFileName: batch.originalFileName,
    status: batch.status,
    totalItems: batch.totalItems,
    processedItems: batch.processedItems,
    successfulItems: batch.successfulItems,
    failedItems: batch.failedItems,
    createdAt: batch.createdAt,
  };
}

export function toBatchProcessResponse(
    batch: BatchProcess
  ): BatchProcessResponseDto {
    return {
      id: batch.id,
      originalFileName: batch.originalFileName,
      status: batch.status,
      totalItems: batch.totalItems,
      processedItems: batch.processedItems,
      successfulItems: batch.successfulItems,
      failedItems: batch.failedItems,
      progressPercentage: batch.progressPercentage,
      createdAt: batch.createdAt,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      failureMessage: batch.failureMessage,
    };
  }

  export function toBatchItemsResponse(
    items: BatchTransferItem[],
    page: number,
    pageSize: number,
    total: number,
  ): BatchItemsResponseDto {
    return {
      data: items.map((item) => ({
        rowNumber: item.rowNumber,
        sourceAccountNumber: item.sourceAccountNumber,
        destinationAccountNumber: item.destinationAccountNumber,
        amount: formatMoneyString(item.amount),
        status: item.status,
        attemptCount: item.attemptCount,
        transferId: item.transferId,
        errorCode: item.errorCode,
        errorMessage: item.errorMessage,
        processedAt: item.processedAt,
      })),
  
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }