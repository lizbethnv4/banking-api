import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainException } from '../common/errors/domain.exception.js';
import {
  generateAccountNumber,
  isUuid,
} from '../common/utils/utils.js';
import { Account } from '../database/entities/account.entity.js';
import { AccountStatus } from '../database/enums.js';
import {
  toAccountBalanceResponse,
  toAccountResponse,
} from './accounts.mapper.js';
import { AccountBalanceResponseDto } from './dto/account-balance-response.dto.js';
import { AccountResponseDto } from './dto/account-response.dto.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { AccountMovement } from '../database/entities/account-movement.entity.js';
import { GetAccountMovementsQueryDto } from './dto/get-account-movements-query.dto.js';
import { AccountMovementsResponseDto } from './dto/account-movements-response.dto.js';
import { toAccountMovementsResponse, toAccountStatementResponse } from './account-movements.mapper.js';
import { GetAccountStatementQueryDto } from './dto/get-account-statement-query.dto.js';
import { AccountStatementResponseDto } from './dto/account-statement-response.dto.js';
import { In } from 'typeorm';

const MAX_ACCOUNT_NUMBER_ATTEMPTS = 5;

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(AccountMovement)
    private readonly accountMovementRepository: Repository<AccountMovement>,
  ) { }

  async create(createAccountDto: CreateAccountDto): Promise<AccountResponseDto> {
    for (let attempt = 0; attempt < MAX_ACCOUNT_NUMBER_ATTEMPTS; attempt++) {
      const accountNumber = generateAccountNumber();

      const alreadyExists = await this.accountRepository.exists({
        where: { accountNumber },
      });
      if (alreadyExists) {
        continue;
      }

      const account = this.accountRepository.create({
        accountNumber,
        holderName: createAccountDto.holderName,
        currency: 'DOP',
        balance: '0',
        status: AccountStatus.ACTIVE,
      });

      const saved = await this.accountRepository.save(account);
      return toAccountResponse(saved);
    }

    throw new DomainException(
      'INTERNAL_ERROR',
      'No se pudo generar un número de cuenta único.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async findByIdOrNumber(idOrNumber: string): Promise<AccountResponseDto> {
    const account = await this.findAccountEntity(idOrNumber);
    return toAccountResponse(account);
  }

  async getBalance(
    idOrNumber: string,
  ): Promise<AccountBalanceResponseDto> {
    const account = await this.findAccountEntity(idOrNumber);
    return toAccountBalanceResponse(account);
  }

  async findAccountEntity(idOrNumber: string): Promise<Account> {
    const account = isUuid(idOrNumber)
      ? await this.accountRepository.findOne({
        where: { id: idOrNumber },
      })
      : await this.accountRepository.findOne({
        where: { accountNumber: idOrNumber },
      });

    if (!account) {
      throw new DomainException(
        'ACCOUNT_NOT_FOUND',
        'No existe una cuenta con ese identificador.',
        HttpStatus.NOT_FOUND,
      );
    }

    return account;
  }

  async getMovements(
    idOrNumber: string,
    filters: GetAccountMovementsQueryDto,
  ): Promise<AccountMovementsResponseDto> {
    const account = await this.findAccountEntity(idOrNumber);

    const {
      page = 1,
      pageSize = 20,
      from,
      to,
      type,
      minAmount,
      maxAmount,
    } = filters;

    const query = this.accountMovementRepository.createQueryBuilder('movement')
      .where('movement.accountId = :accountId', { accountId: account.id })

    if (from) {
      query.andWhere('movement.createdAt >= :from', { from });
    }

    if (to) {
      query.andWhere('movement.createdAt <= :to', { to });
    }

    if (type) {
      query.andWhere('movement.type = :type', { type });
    }

    if (minAmount) {
      query.andWhere('movement.amount >= :minAmount', { minAmount });
    }

    if (maxAmount) {
      query.andWhere('movement.amount <= :maxAmount', { maxAmount });
    }

    query.orderBy('movement.createdAt', 'DESC')
      .addOrderBy('movement.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [movements, total] = await query.getManyAndCount();

    return toAccountMovementsResponse(movements, page, pageSize, total);
  }

  async getStatement(
    idOrNumber: string,
    filters: GetAccountStatementQueryDto,
  ): Promise<AccountStatementResponseDto> {
    const account = await this.findAccountEntity(idOrNumber);
    const { year, month } = filters;
    const fromDate = new Date(year, month - 1, 1).toISOString();
    const toDate = new Date(year, month, 0).toISOString();

    const movements = await this.accountMovementRepository
      .createQueryBuilder('movement')
      .where('movement.accountId = :accountId', {
        accountId: account.id
      })
      .andWhere('movement.createdAt >= :fromDate', {
        fromDate
      })
      .andWhere('movement.createdAt <= :toDate', {
        toDate
      })
      .orderBy('movement.createdAt', 'ASC')
      .addOrderBy('movement.id', 'ASC')
      .getMany();

    const totals = await this.accountMovementRepository
      .createQueryBuilder('movement')
      .select(
        `
        COALESCE(
          SUM(
            CASE
              WHEN movement.type = 'CREDIT'
              THEN movement.amount
              ELSE 0
            END
          ),
          0
        )
        `,
        'totalCredits',
      )
      .addSelect(
        `
        COALESCE(
          SUM(
            CASE
              WHEN movement.type = 'DEBIT'
              THEN movement.amount
              ELSE 0
            END
          ),
          0
        )
        `,
        'totalDebits',
      )
      .where('movement.accountId = :accountId', {
        accountId: account.id,
      })
      .andWhere('movement.createdAt >= :fromDate', {
        fromDate,
      })
      .andWhere('movement.createdAt < :toDate', {
        toDate,
      })
      .getRawOne<{
        totalCredits: string;
        totalDebits: string;
      }>();

    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const from = `${year}-${String(month).padStart(2, '0')}-01`;

    const to = `${year}-${String(month).padStart(2, '0')}-${String(
      lastDay,
    ).padStart(2, '0')}`;

    return toAccountStatementResponse(
      account,
      movements,
      year,
      month,
      from,
      to,
      totals?.totalCredits ?? '0',
      totals?.totalDebits ?? '0',
    );
  }

  async findAccountsByNumbers(
    accountNumbers: string[],
  ): Promise<Account[]> {
    if (accountNumbers.length === 0) {
      return [];
    }

    return this.accountRepository.find({
      where: {
        accountNumber: In(accountNumbers),
      },
    });
  }
}
