import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service.js';
import { AccountBalanceResponseDto } from './dto/account-balance-response.dto.js';
import { AccountResponseDto } from './dto/account-response.dto.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { GetAccountMovementsQueryDto } from './dto/get-account-movements-query.dto.js';
import { AccountMovementsResponseDto } from './dto/account-movements-response.dto.js';
import { AccountStatementResponseDto } from './dto/account-statement-response.dto.js';
import {
  GetAccountStatementPeriodQueryDto,
  GetAccountStatementQueryDto,
} from './dto/get-account-statement-query.dto.js';

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

  @Get(':idOrNumber/statement/pdf')
  @ApiOperation({
    summary: 'Descargar el estado de cuenta del período completo en PDF',
    description:
      'Devuelve application/pdf con todos los movimientos del mes. No usa page ni pageSize. El resumen se calcula en SQL sobre el período completo.',
  })
  @ApiQuery({ name: 'year', required: true, example: 2026, type: Number })
  @ApiQuery({ name: 'month', required: true, example: 9, type: Number })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'Archivo PDF del estado de cuenta.',
    content: {
      'application/pdf': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  async getStatementPdf(
    @Param('idOrNumber') idOrNumber: string,
    @Query() filters: GetAccountStatementPeriodQueryDto,
  ): Promise<StreamableFile> {
    const file = await this.accountsService.getStatementPdf(
      idOrNumber,
      filters,
    );

    return new StreamableFile(file.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get(':idOrNumber/statement')
  @ApiOperation({
    summary: 'Consultar estado de cuenta por id o número de cuenta',
    description:
      'El resumen cubre todo el mes. movements.data trae solo la página pedida.',
  })
  @ApiQuery({ name: 'year', required: true, example: 2026, type: Number })
  @ApiQuery({ name: 'month', required: true, example: 9, type: Number })
  @ApiQuery({ name: 'page', required: false, example: 1, type: Number })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    example: 20,
    type: Number,
  })
  @ApiOkResponse({ type: AccountStatementResponseDto })
  getStatement(
    @Param('idOrNumber') idOrNumber: string,
    @Query() filters: GetAccountStatementQueryDto,
  ): Promise<AccountStatementResponseDto> {
    return this.accountsService.getStatement(idOrNumber, filters);
  }
}
