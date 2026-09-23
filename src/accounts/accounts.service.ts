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

const MAX_ACCOUNT_NUMBER_ATTEMPTS = 5;

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

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
}
