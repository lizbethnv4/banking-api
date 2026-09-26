import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { TransfersService } from './transfers.service.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transfer')
export class TransfersController {
    constructor(private readonly transfersService: TransfersService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear transferencia' })
    //@ApiCreatedResponse({ type: TransferResponseDto })
    async create(@Body() createTransferDto: CreateTransferDto) {
        return this.transfersService.create(createTransferDto);
    }
}
