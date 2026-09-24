import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service.js';
import { AccountBalanceResponseDto } from './dto/account-balance-response.dto.js';
import { AccountResponseDto } from './dto/account-response.dto.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { GetAccountMovementsQueryDto } from './dto/get-account-movements-query.dto.js';
import { AccountMovementsResponseDto } from './dto/account-movements-response.dto.js';
import { AccountStatementResponseDto } from './dto/account-statement-response.dto.js';
import { GetAccountStatementQueryDto } from './dto/get-account-statement-query.dto.js';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear cuenta (saldo inicial 0, número generado)' })
  @ApiCreatedResponse({ type: AccountResponseDto })
  create(@Body() createAccountDto: CreateAccountDto): Promise<AccountResponseDto> {
    return this.accountsService.create(createAccountDto);
  }

  @Get(':idOrNumber/balance')
  @ApiOperation({ summary: 'Consultar saldo por id o número de cuenta' })
  @ApiOkResponse({ type: AccountBalanceResponseDto })
  getBalance(
    @Param('idOrNumber') idOrNumber: string,
  ): Promise<AccountBalanceResponseDto> {
    return this.accountsService.getBalance(idOrNumber);
  }

  @Get(':idOrNumber')
  @ApiOperation({ summary: 'Consultar cuenta por id o número' })
  @ApiOkResponse({ type: AccountResponseDto })
  findOne(
    @Param('idOrNumber') idOrNumber: string,
  ): Promise<AccountResponseDto> {
    return this.accountsService.findByIdOrNumber(idOrNumber);
  }

  @Get(':idOrNumber/movements')
  @ApiOperation({ summary: 'Consultar movimientos por id o número de cuenta' })
  @ApiOkResponse({ type: AccountMovementsResponseDto })
  getMovements(
    @Param('idOrNumber') idOrNumber: string,
    @Query() filters: GetAccountMovementsQueryDto,
  ): Promise<AccountMovementsResponseDto> {
    return this.accountsService.getMovements(idOrNumber, filters);
  }

  @Get(':idOrNumber/statement')
  @ApiOperation({ summary: 'Consultar estado de cuenta por id o número de cuenta' })
  @ApiOkResponse({ type: AccountStatementResponseDto })
  getStatement(
    @Param('idOrNumber') idOrNumber: string,
    @Query() filters: GetAccountStatementQueryDto,
  ): Promise<AccountStatementResponseDto> {
    return this.accountsService.getStatement(idOrNumber, filters);
  }
}
