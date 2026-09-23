import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { DomainException } from './common/errors/domain.exception.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new DomainException(
          'VALIDATION_ERROR',
          'La solicitud contiene datos inválidos.',
          HttpStatus.BAD_REQUEST,
          {
            errors: errors.map((error) => ({
              property: error.property,
              constraints: error.constraints,
            })),
          },
        ),
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Banking API')
    .setDescription(
      'API de cuentas, transferencias atómicas y procesamiento por lote. ' +
        'Incluye el caso de concurrencia con saldo RD$10,000 y transferencias simultáneas de RD$8,000 y RD$7,000.',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
