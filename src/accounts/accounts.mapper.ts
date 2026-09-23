import { formatMoneyString } from '../common/utils/utils.js';
import { Account } from '../database/entities/account.entity.js';
import { AccountBalanceResponseDto } from './dto/account-balance-response.dto.js';
import { AccountResponseDto } from './dto/account-response.dto.js';

export function toAccountResponse(account: Account): AccountResponseDto {
  return {
    id: account.id,
    accountNumber: account.accountNumber,
    holderName: account.holderName,
    balance: formatMoneyString(account.balance),
    currency: account.currency,
    status: account.status,
  };
}

export function toAccountBalanceResponse(
  account: Account,
): AccountBalanceResponseDto {
  return {
    accountId: account.id,
    accountNumber: account.accountNumber,
    balance: formatMoneyString(account.balance),
    currency: account.currency,
  };
}
