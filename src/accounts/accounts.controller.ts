import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
}
