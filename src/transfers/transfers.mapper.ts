import { formatMoneyString } from '../common/utils/utils.js';
import { Transfer } from '../database/entities/transfer.entity.js';
import { TransferResponseDto } from './dto/transfer-response.dto.js';

export function toTransferResponse(transfer: Transfer): TransferResponseDto {
  return {
    id: transfer.id,
    reference: transfer.reference,
    sourceAccountId: transfer.sourceAccountId,
    destinationAccountId: transfer.destinationAccountId,
    amount: formatMoneyString(transfer.amount),
    status: transfer.status,
    idempotencyKey: transfer.idempotencyKey,
    failureCode: transfer.failureCode,
    failureMessage: transfer.failureMessage,
    createdAt: transfer.createdAt,
    completedAt: transfer.completedAt,
  };
}
