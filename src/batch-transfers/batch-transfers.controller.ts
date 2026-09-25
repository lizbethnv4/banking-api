import {
    BadRequestException,
    Controller,
    Param,
    Post,
    UploadedFile,
    UseInterceptors,
    Get,
    Query,
} from '@nestjs/common';
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { BatchTransfersService } from './batch-transfers.service.js';
import { CreateBatchResponseDto } from './dto/create-batch-response.dto.js';
import { BatchProcessResponseDto } from './dto/batch-process-response.dto.js';
import { BatchItemsResponseDto } from './dto/batch-items-response.dto.js';
import { GetBatchItemsQueryDto } from './dto/get-batch-items-query.dto.js';

@ApiTags('Batch Transfers')
@Controller('batch-transfers')
export class BatchTransfersController {
    constructor(
        private readonly batchTransfersService: BatchTransfersService,
    ) { }

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({
        summary: 'Create batch transfer process from CSV',
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

    @Get(':id')
    @ApiOperation({ summary: 'Get batch transfer process by id' })
    @ApiOkResponse({ type: BatchProcessResponseDto })
    async findById(
        @Param('id') id: string,
    ): Promise<BatchProcessResponseDto> {
        return this.batchTransfersService.findById(id);
    }

    @Get(':id/items')
    @ApiOperation({ summary: 'Get batch transfer items by id' })
    @ApiOkResponse({ type: BatchItemsResponseDto })
    async getItems(
        @Param('id') id: string,
        @Query() query: GetBatchItemsQueryDto,
    ): Promise<BatchItemsResponseDto> {
        return this.batchTransfersService.getItems(id, query);
    }
}