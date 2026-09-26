import {
    BadRequestException,
    Controller,
    Param,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    Get,
    Query,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { RoleName } from '../database/enums.js';

import { BatchTransfersService } from './batch-transfers.service.js';
import { CreateBatchResponseDto } from './dto/create-batch-response.dto.js';
import { BatchProcessOptionResponseDto } from './dto/batch-process-option-response.dto.js';
import { BatchProcessResponseDto } from './dto/batch-process-response.dto.js';
import { BatchItemsResponseDto } from './dto/batch-items-response.dto.js';
import { GetBatchItemsQueryDto } from './dto/get-batch-items-query.dto.js';

@ApiTags('Batch Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('batch-transfers')
export class BatchTransfersController {
    constructor(
        private readonly batchTransfersService: BatchTransfersService,
    ) { }

    @Post()
    @Roles(RoleName.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({
        summary: 'Crea un proceso de transferencia por lotes desde un archivo CSV',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
            required: ['file'],
        },
    })
    @ApiCreatedResponse({
        type: CreateBatchResponseDto,
    })
    async createBatch(
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<CreateBatchResponseDto> {
        if (!file) {
            throw new BadRequestException('CSV file is required');
        }

        return this.batchTransfersService.createBatch(file);
    }

    @Get('options')
    @Roles(RoleName.ADMIN, RoleName.USER)
    @ApiOperation({
        summary: 'Retorna los procesos de transferencia por lotes para los selectores.',
    })
    @ApiOkResponse({ type: BatchProcessOptionResponseDto, isArray: true })
    findOptions(): Promise<BatchProcessOptionResponseDto[]> {
        return this.batchTransfersService.findOptions();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtiene un proceso de transferencia por lotes por su id' })
    @ApiOkResponse({ type: BatchProcessResponseDto })
    async findById(
        @Param('id') id: string,
    ): Promise<BatchProcessResponseDto> {
        return this.batchTransfersService.findById(id);
    }

    @Get(':id/items')
    @ApiOperation({ summary: 'Obtiene los items de un proceso de transferencia por lotes por su id' })
    @ApiOkResponse({ type: BatchItemsResponseDto })
    async getItems(
        @Param('id') id: string,
        @Query() query: GetBatchItemsQueryDto,
    ): Promise<BatchItemsResponseDto> {
        return this.batchTransfersService.getItems(id, query);
    }
}