import { formatMoneyString } from "../common/utils/utils.js";
import { AccountMovement } from "../database/entities/account-movement.entity.js";
import { AccountMovementResponseDto } from "./dto/account-movement-response.dto.js";
import { AccountMovementsResponseDto } from "./dto/account-movements-response.dto.js";
import { Account } from "../database/entities/account.entity.js";
import { AccountStatementResponseDto } from "./dto/account-statement-response.dto.js";


export function toAccountMovementResponse(
  movement: AccountMovement,
): AccountMovementResponseDto {
  return {
    id: movement.id,
    transferId: movement.transferId,
    type: movement.type,
    amount: formatMoneyString(movement.amount),
    balanceBefore: formatMoneyString(movement.balanceBefore),
    balanceAfter: formatMoneyString(movement.balanceAfter),
    description: movement.description,
    createdAt: movement.createdAt,
  };
}

export function toAccountMovementsResponse(
  movements: AccountMovement[],
  page: number,
  pageSize: number,
  total: number,
): AccountMovementsResponseDto {
  return {
    data: movements.map(movement => toAccountMovementResponse(movement)),
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export function toAccountStatementResponse(
  account: Account,
  movements: AccountMovement[],
  year: number,
  month: number,
  from: string,
  to: string,
  totalCredits: string,
  totalDebits: string,
  page: number,
  pageSize: number,
  total: number,
): AccountStatementResponseDto {
  return {
    account: {
      id: account.id,
      accountNumber: account.accountNumber,
      holderName: account.holderName,
      currency: account.currency,
      status: account.status,
    },
    period: {
      year,
      month,
      from,
      to,
    },
    summary: {
      totalCredits: formatMoneyString(totalCredits),
      totalDebits: formatMoneyString(totalDebits),
    },
    movements: toAccountMovementsResponse(
      movements,
      page,
      pageSize,
      total,
    ),
  };
}