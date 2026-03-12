import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LogLevel, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { rabbitmq } from './utils/rabbitmq';
import express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bodyParser: false
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  app.use('/api/v1/github/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  await app.listen(port);
  logger.log(`Server is running on http://localhost:${port}`);
  await rabbitmq();
  logger.log('RabbitMQ is connected');
}

bootstrap();
