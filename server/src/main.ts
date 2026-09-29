import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
  app.useBodyParser('json', { limit: '200kb' });
  const config = configureApp(app);
  await app.listen(config.port);
  Logger.log(`API ready on http://localhost:${config.port}/api  ·  docs at /api/docs`, 'Bootstrap');
}

bootstrap();
