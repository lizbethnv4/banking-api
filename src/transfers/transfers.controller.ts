import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { TransfersService } from './transfers.service.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { TransferResponseDto } from './dto/transfer-response.dto.js';

@ApiTags('transfer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transfer')
export class TransfersController {
    constructor(private readonly transfersService: TransfersService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear transferencia' })
    @ApiCreatedResponse({ type: TransferResponseDto })
    async create(
        @Body() createTransferDto: CreateTransferDto,
    ): Promise<TransferResponseDto> {
        return this.transfersService.create(createTransferDto);
    }
}
