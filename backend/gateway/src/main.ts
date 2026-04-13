import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AxiosProxyExceptionFilter } from './filters/axios-proxy-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );
  app.useGlobalFilters(new AxiosProxyExceptionFilter());

  const port = process.env.GATEWAY_PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
