import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApplicationExceptionFilter } from './common/filters/application-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  });
  app.useGlobalFilters(new ApplicationExceptionFilter());

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);

  Logger.log(`API server listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
