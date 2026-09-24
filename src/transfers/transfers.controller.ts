import { Controller } from '@nestjs/common';
import { TransfersService } from './transfers.service.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiCreatedResponse } from '@nestjs/swagger';


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
